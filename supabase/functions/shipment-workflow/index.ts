import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface WorkflowRequest {
  action: string;
  shipment_id?: string;
  data?: Record<string, unknown>;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Authenticate caller
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();
    if (userError || !user) throw new Error("Unauthorized");

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const body: WorkflowRequest = await req.json();
    const { action, shipment_id, data = {} } = body;

    if (!action) throw new Error("action is required");

    let result: Record<string, unknown> = {};

    switch (action) {
      // ===== CREATE DRAFT =====
      case "create_shipment_draft": {
        const shipmentData = {
          user_id: user.id,
          company_id: data.company_id || null,
          customer_id: data.customer_id || null,
          status: "draft",
          lifecycle_stage: "draft",
          shipment_type: data.shipment_type || null,
          mode: data.mode || "ocean",
          origin_port: data.origin || null,
          destination_port: data.destination || null,
          commodity: data.commodity || null,
          incoterms: data.incoterms || null,
          priority_level: data.priority_level || "standard",
        };

        const { data: shipment, error } = await adminClient
          .from("shipments")
          .insert(shipmentData)
          .select()
          .single();
        if (error) throw error;

        // Create cargo if provided
        if (data.cargo) {
          await adminClient.from("cargo").insert({
            shipment_id: shipment.id,
            ...(data.cargo as Record<string, unknown>),
          });
        }

        // Create services record
        if (data.services) {
          await adminClient.from("shipment_services").insert({
            shipment_id: shipment.id,
            ...(data.services as Record<string, unknown>),
          });
        }

        result = { shipment_id: shipment.id, shipment_ref: shipment.shipment_ref, status: "draft" };
        break;
      }

      // ===== SUBMIT FOR PRICING =====
      case "submit_for_pricing": {
        if (!shipment_id) throw new Error("shipment_id required");

        const { data: ship } = await adminClient
          .from("shipments")
          .select("id, lifecycle_stage, shipment_type, origin_port, destination_port, company_id")
          .eq("id", shipment_id)
          .single();
        if (!ship) throw new Error("Shipment not found");

        // Validation
        if (!["draft", "quote_ready"].includes(ship.lifecycle_stage || "")) {
          throw new Error(`Cannot submit for pricing from stage: ${ship.lifecycle_stage}`);
        }
        if (!ship.origin_port || !ship.destination_port) {
          throw new Error("Origin and destination are required before pricing");
        }

        // Update lifecycle - triggers handle milestones, notifications, tasks, audit
        const { error } = await adminClient
          .from("shipments")
          .update({
            lifecycle_stage: "pending_pricing",
            status: "pending_pricing",
            assigned_pricing_user_id: (data.pricing_user_id as string) || null,
          })
          .eq("id", shipment_id);
        if (error) throw error;

        result = { shipment_id, lifecycle_stage: "pending_pricing" };
        break;
      }

      // ===== CALCULATE PRICING =====
      case "calculate_pricing": {
        if (!shipment_id) throw new Error("shipment_id required");

        const costLines = (data.cost_lines || []) as Array<Record<string, unknown>>;
        const scenarioName = (data.scenario_name as string) || "Default";
        const companyId = data.company_id as string;

        if (!companyId) throw new Error("company_id required");

        // Create pricing scenario
        const { data: scenario, error: sErr } = await adminClient
          .from("pricing_scenarios")
          .insert({
            shipment_id,
            company_id: companyId,
            scenario_name: scenarioName,
            pricing_status: "draft",
            is_active: true,
            is_selected: false,
            shipment_type: data.shipment_type as string,
            base_margin_percent: (data.base_margin_percent as number) || 15,
            final_margin_percent: (data.final_margin_percent as number) || 15,
            minimum_margin_percent: (data.minimum_margin_percent as number) || 5,
            stretch_margin_percent: (data.stretch_margin_percent as number) || 25,
            manual_override: (data.manual_override as boolean) || false,
            created_by_user_id: user.id,
          })
          .select()
          .single();
        if (sErr) throw sErr;

        // Insert cost lines
        if (costLines.length > 0) {
          const lines = costLines.map((cl) => ({
            pricing_scenario_id: scenario.id,
            cost_category: cl.cost_category,
            cost_type: cl.cost_type,
            amount: cl.amount,
            currency: (cl.currency as string) || "USD",
            notes: cl.notes || null,
          }));
          await adminClient.from("pricing_cost_lines").insert(lines);
        }

        // Calculate outputs
        const { data: allLines } = await adminClient
          .from("pricing_cost_lines")
          .select("*")
          .eq("pricing_scenario_id", scenario.id);

        const directCost = (allLines || [])
          .filter((l) => l.cost_category === "direct")
          .reduce((s, l) => s + (l.amount || 0), 0);
        const variableCost = (allLines || [])
          .filter((l) => l.cost_category === "variable")
          .reduce((s, l) => s + (l.amount || 0), 0);
        const fixedCost = (allLines || [])
          .filter((l) => l.cost_category === "fixed")
          .reduce((s, l) => s + (l.amount || 0), 0);
        const networkCost = (allLines || [])
          .filter((l) => l.cost_category === "network_payout")
          .reduce((s, l) => s + (l.amount || 0), 0);

        const totalCost = directCost + variableCost + fixedCost + networkCost;
        const marginPercent = scenario.final_margin_percent || 15;
        const recommendedPrice = totalCost / (1 - marginPercent / 100);
        const breakEvenPrice = totalCost;
        const minPrice = totalCost / (1 - (scenario.minimum_margin_percent || 5) / 100);
        const stretchPrice = totalCost / (1 - (scenario.stretch_margin_percent || 25) / 100);
        const grossProfit = recommendedPrice - directCost;
        const netProfit = recommendedPrice - totalCost;

        const { error: oErr } = await adminClient.from("pricing_outputs").insert({
          pricing_scenario_id: scenario.id,
          total_direct_cost: directCost,
          total_variable_cost: variableCost,
          fixed_cost_per_shipment: fixedCost,
          total_network_payout_cost: networkCost,
          true_total_cost: totalCost,
          break_even_price: breakEvenPrice,
          minimum_acceptable_sell_price: minPrice,
          recommended_sell_price: recommendedPrice,
          stretch_sell_price: stretchPrice,
          gross_profit: grossProfit,
          gross_margin_percent: recommendedPrice > 0 ? (grossProfit / recommendedPrice) * 100 : 0,
          contribution_profit: recommendedPrice - directCost - variableCost,
          contribution_margin_percent:
            recommendedPrice > 0
              ? ((recommendedPrice - directCost - variableCost) / recommendedPrice) * 100
              : 0,
          net_profit: netProfit,
          net_margin_percent: recommendedPrice > 0 ? (netProfit / recommendedPrice) * 100 : 0,
        });
        if (oErr) throw oErr;

        // Check safeguards
        const warnings: string[] = [];
        if (netProfit < 0) warnings.push("Net profit is negative");
        if (marginPercent < (scenario.minimum_margin_percent || 5))
          warnings.push("Margin below minimum threshold");
        if (scenario.manual_override) warnings.push("Manual override active — approval required");

        const needsApproval = warnings.length > 0;

        // Update scenario status
        await adminClient
          .from("pricing_scenarios")
          .update({
            pricing_status: needsApproval ? "submitted_for_approval" : "calculated",
          })
          .eq("id", scenario.id);

        // Create approval if needed
        if (needsApproval && companyId) {
          await adminClient.from("approvals").insert({
            company_id: companyId,
            entity_type: "pricing_scenario",
            entity_id: scenario.id,
            approval_type: scenario.manual_override ? "manual_override" : "margin_exception",
            status: "pending",
            requested_by_user_id: user.id,
            reason_note: warnings.join("; "),
          });
        }

        result = {
          scenario_id: scenario.id,
          total_cost: totalCost,
          recommended_price: recommendedPrice,
          net_profit: netProfit,
          margin_percent: marginPercent,
          needs_approval: needsApproval,
          warnings,
        };
        break;
      }

      // ===== APPROVE QUOTE =====
      case "approve_quote": {
        if (!shipment_id) throw new Error("shipment_id required");
        const approvalType = (data.approval_type as string) || "customer";

        if (approvalType === "internal") {
          // Internal pricing approval
          const approvalId = data.approval_id as string;
          if (!approvalId) throw new Error("approval_id required");

          await adminClient
            .from("approvals")
            .update({
              status: "approved",
              decided_at: new Date().toISOString(),
              decision_note: (data.decision_note as string) || null,
            })
            .eq("id", approvalId);

          // Get the scenario from approval
          const { data: approval } = await adminClient
            .from("approvals")
            .select("entity_id")
            .eq("id", approvalId)
            .single();

          if (approval) {
            await adminClient
              .from("pricing_scenarios")
              .update({ pricing_status: "approved", approved_by_user_id: user.id, approved_at: new Date().toISOString() })
              .eq("id", approval.entity_id);
          }

          // Move to quote_ready
          await adminClient
            .from("shipments")
            .update({ lifecycle_stage: "quote_ready", status: "quote_ready" })
            .eq("id", shipment_id);

          result = { shipment_id, lifecycle_stage: "quote_ready", approval_status: "approved" };
        } else {
          // Customer approval → book shipment
          const { data: ship } = await adminClient
            .from("shipments")
            .select("lifecycle_stage, company_id")
            .eq("id", shipment_id)
            .single();

          if (!ship || !["quote_ready"].includes(ship.lifecycle_stage || "")) {
            throw new Error("Shipment not in approvable state");
          }

          // Select the active pricing scenario
          const { data: scenario } = await adminClient
            .from("pricing_scenarios")
            .select("id")
            .eq("shipment_id", shipment_id)
            .eq("is_active", true)
            .order("created_at", { ascending: false })
            .limit(1)
            .single();

          if (scenario) {
            // Unselect all, then select this one
            await adminClient
              .from("pricing_scenarios")
              .update({ is_selected: false })
              .eq("shipment_id", shipment_id);

            await adminClient
              .from("pricing_scenarios")
              .update({ is_selected: true, pricing_status: "applied" })
              .eq("id", scenario.id);
          }

          // Transition to booked — triggers handle milestones, tasks, docs, notifications
          await adminClient
            .from("shipments")
            .update({ lifecycle_stage: "booked", status: "booked" })
            .eq("id", shipment_id);

          result = { shipment_id, lifecycle_stage: "booked" };
        }
        break;
      }

      // ===== REJECT QUOTE =====
      case "reject_quote": {
        if (!shipment_id) throw new Error("shipment_id required");
        const reason = (data.reason as string) || "No reason provided";
        const rejectionType = (data.rejection_type as string) || "customer";

        if (rejectionType === "internal" && data.approval_id) {
          await adminClient
            .from("approvals")
            .update({
              status: "rejected",
              decided_at: new Date().toISOString(),
              decision_note: reason,
            })
            .eq("id", data.approval_id);

          await adminClient
            .from("pricing_scenarios")
            .update({ pricing_status: "rejected" })
            .eq("id", data.scenario_id);
        }

        // Move back to pending_pricing
        await adminClient
          .from("shipments")
          .update({ lifecycle_stage: "pending_pricing", status: "pending_pricing" })
          .eq("id", shipment_id);

        result = { shipment_id, lifecycle_stage: "pending_pricing", reason };
        break;
      }

      // ===== REQUEST REPRICING =====
      case "request_repricing": {
        if (!shipment_id) throw new Error("shipment_id required");

        await adminClient
          .from("shipments")
          .update({ lifecycle_stage: "pending_pricing", status: "pending_pricing" })
          .eq("id", shipment_id);

        result = { shipment_id, lifecycle_stage: "pending_pricing" };
        break;
      }

      // ===== START TRANSIT =====
      case "start_transit": {
        if (!shipment_id) throw new Error("shipment_id required");

        await adminClient
          .from("shipments")
          .update({
            lifecycle_stage: "in_transit",
            status: "in_transit",
            actual_departure: data.actual_departure || new Date().toISOString(),
          })
          .eq("id", shipment_id);

        result = { shipment_id, lifecycle_stage: "in_transit" };
        break;
      }

      // ===== MARK DELIVERED =====
      case "mark_delivered": {
        if (!shipment_id) throw new Error("shipment_id required");

        await adminClient
          .from("shipments")
          .update({
            lifecycle_stage: "delivered",
            status: "delivered",
            actual_arrival: data.actual_arrival || new Date().toISOString(),
          })
          .eq("id", shipment_id);

        result = { shipment_id, lifecycle_stage: "delivered" };
        break;
      }

      // ===== CLOSE SHIPMENT =====
      case "close_shipment": {
        if (!shipment_id) throw new Error("shipment_id required");

        // Check for open critical items unless admin override
        const isAdmin = data.admin_override === true;
        if (!isAdmin) {
          const { count: pendingDocs } = await adminClient
            .from("documents")
            .select("id", { count: "exact" })
            .eq("shipment_id", shipment_id)
            .eq("status", "pending");

          if ((pendingDocs || 0) > 0) {
            throw new Error(`Cannot close: ${pendingDocs} pending documents remain`);
          }
        }

        await adminClient
          .from("shipments")
          .update({ lifecycle_stage: "closed", status: "closed" })
          .eq("id", shipment_id);

        // Complete all open tasks for this shipment
        await adminClient
          .from("tasks")
          .update({ status: "completed", completed_at: new Date().toISOString() })
          .eq("shipment_id", shipment_id)
          .eq("status", "open");

        result = { shipment_id, lifecycle_stage: "closed" };
        break;
      }

      // ===== CANCEL SHIPMENT =====
      case "cancel_shipment": {
        if (!shipment_id) throw new Error("shipment_id required");
        const cancelReason = data.reason as string;
        if (!cancelReason) throw new Error("Cancellation reason is required");

        const { data: ship } = await adminClient
          .from("shipments")
          .select("lifecycle_stage")
          .eq("id", shipment_id)
          .single();

        // Booked/in-transit cancellation needs admin check
        if (ship && ["booked", "in_transit"].includes(ship.lifecycle_stage || "")) {
          const { data: isAdm } = await userClient.rpc("has_role", {
            _user_id: user.id,
            _role: "admin",
          });
          if (!isAdm) throw new Error("Only admins can cancel booked/in-transit shipments");
        }

        await adminClient
          .from("shipments")
          .update({ lifecycle_stage: "cancelled", status: "cancelled" })
          .eq("id", shipment_id);

        // Cancel open tasks
        await adminClient
          .from("tasks")
          .update({ status: "cancelled" })
          .eq("shipment_id", shipment_id)
          .eq("status", "open");

        result = { shipment_id, lifecycle_stage: "cancelled", reason: cancelReason };
        break;
      }

      // ===== ASSIGN PARTNER =====
      case "assign_partner": {
        if (!shipment_id) throw new Error("shipment_id required");
        const partnerId = data.partner_id as string;
        const roleType = data.role_type as string;
        const partnerName = data.partner_name as string;

        if (!roleType) throw new Error("role_type required");

        const { data: party, error: pErr } = await adminClient
          .from("shipment_parties")
          .insert({
            shipment_id,
            partner_id: partnerId || null,
            name: partnerName || null,
            role: roleType,
            role_type: roleType,
            assigned_by_user_id: user.id,
          })
          .select()
          .single();
        if (pErr) throw pErr;

        result = { party_id: party.id, shipment_id, role_type: roleType };
        break;
      }

      // ===== REMOVE PARTNER =====
      case "remove_partner": {
        const partyId = data.party_id as string;
        if (!partyId) throw new Error("party_id required");

        await adminClient.from("shipment_parties").delete().eq("id", partyId);

        // Audit log
        await adminClient.from("audit_log").insert({
          table_name: "shipment_parties",
          record_id: partyId,
          action: "PARTNER_REMOVED",
          user_id: user.id,
          new_data: { reason: data.reason || "No reason provided" },
        });

        result = { removed: true, party_id: partyId };
        break;
      }

      // ===== UPLOAD DOCUMENT =====
      case "upload_document": {
        if (!shipment_id) throw new Error("shipment_id required");

        const { data: doc, error: dErr } = await adminClient
          .from("documents")
          .upsert(
            {
              shipment_id,
              user_id: user.id,
              doc_type: data.doc_type as string,
              file_url: data.file_url as string,
              status: "received",
            },
            { onConflict: "id" }
          )
          .select()
          .single();
        if (dErr) throw dErr;

        result = { document_id: doc.id, status: "received" };
        break;
      }

      // ===== APPROVE/REJECT DOCUMENT =====
      case "approve_document":
      case "reject_document": {
        const docId = data.document_id as string;
        if (!docId) throw new Error("document_id required");

        const newStatus = action === "approve_document" ? "approved" : "rejected";
        await adminClient
          .from("documents")
          .update({ status: newStatus })
          .eq("id", docId);

        if (action === "reject_document" && data.reason) {
          await adminClient.from("audit_log").insert({
            table_name: "documents",
            record_id: docId,
            action: "DOCUMENT_REJECTED",
            user_id: user.id,
            new_data: { reason: data.reason },
          });
        }

        result = { document_id: docId, status: newStatus };
        break;
      }

      // ===== SEND MESSAGE =====
      case "send_message": {
        if (!shipment_id) throw new Error("shipment_id required");

        const { data: msg, error: mErr } = await adminClient
          .from("shipment_messages")
          .insert({
            shipment_id,
            company_id: data.company_id as string,
            sender_user_id: user.id,
            message_body: data.message as string,
            visibility_scope: (data.visibility as string) || "internal",
          })
          .select()
          .single();
        if (mErr) throw mErr;

        result = { message_id: msg.id };
        break;
      }

      // ===== COMPLETE TASK =====
      case "complete_task": {
        const taskId = data.task_id as string;
        if (!taskId) throw new Error("task_id required");

        await adminClient
          .from("tasks")
          .update({
            status: "completed",
            completed_at: new Date().toISOString(),
            completed_by_user_id: user.id,
          })
          .eq("id", taskId);

        result = { task_id: taskId, status: "completed" };
        break;
      }

      // ===== UPDATE MILESTONE =====
      case "update_milestone": {
        const milestoneId = data.milestone_id as string;
        if (!milestoneId) throw new Error("milestone_id required");

        await adminClient
          .from("tracking_events")
          .update({
            status: (data.status as string) || "completed",
            location: (data.location as string) || null,
          })
          .eq("id", milestoneId);

        result = { milestone_id: milestoneId, status: data.status || "completed" };
        break;
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
