import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'ALC Shipper Portal'
const SITE_URL = 'https://alllogisticscargo.com'

interface BookingConfirmationProps {
  name?: string
  bookingReference?: string
  origin?: string
  destination?: string
  mode?: string
  carrier?: string
  etd?: string
  eta?: string
  shipmentUrl?: string
}

const row = (label: string, value?: string) =>
  value ? (
    <Text style={detailRow}>
      <span style={detailLabel}>{label}: </span>
      <span style={detailValue}>{value}</span>
    </Text>
  ) : null

const BookingConfirmationEmail = ({
  name,
  bookingReference,
  origin,
  destination,
  mode,
  carrier,
  etd,
  eta,
  shipmentUrl,
}: BookingConfirmationProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>
      Your booking{bookingReference ? ` ${bookingReference}` : ''} is confirmed
    </Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Booking confirmed</Heading>
        <Text style={text}>
          {name ? `Hi ${name}, your` : 'Your'} shipment has been booked successfully.
          You can track its progress and manage documents from your dashboard.
        </Text>

        <Section style={card}>
          {row('Booking Reference', bookingReference)}
          {row('Origin', origin)}
          {row('Destination', destination)}
          {row('Mode', mode)}
          {row('Carrier', carrier)}
          {row('ETD', etd)}
          {row('ETA', eta)}
        </Section>

        <Section style={buttonContainer}>
          <Button href={shipmentUrl || `${SITE_URL}/dashboard/shipments`} style={button}>
            View shipment
          </Button>
        </Section>

        <Hr style={hr} />
        <Text style={footer}>
          Questions about this booking? Reply to this email and our team will assist.
        </Text>
        <Text style={footer}>— The {SITE_NAME} Team</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: BookingConfirmationEmail,
  subject: (data: Record<string, any>) =>
    data?.bookingReference
      ? `Booking confirmed — ${data.bookingReference}`
      : 'Your booking is confirmed',
  displayName: 'Booking confirmation',
  previewData: {
    name: 'Jane',
    bookingReference: 'ALC-2026-00421',
    origin: 'Houston, TX (USHOU)',
    destination: 'Rotterdam, NL (NLRTM)',
    mode: 'Ocean FCL',
    carrier: 'Evergreen',
    etd: '2026-05-02',
    eta: '2026-05-24',
    shipmentUrl: 'https://alllogisticscargo.com/dashboard/shipments',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Inter, Arial, sans-serif' }
const container = { padding: '32px 28px', maxWidth: '560px', margin: '0 auto' }
const h1 = { fontSize: '24px', fontWeight: 700, color: '#0A1F3D', margin: '0 0 16px' }
const text = { fontSize: '15px', color: '#374151', lineHeight: '1.6', margin: '0 0 20px' }
const card = {
  backgroundColor: '#F8FAFC',
  border: '1px solid #E2E8F0',
  borderRadius: '10px',
  padding: '20px 22px',
  margin: '0 0 24px',
}
const detailRow = { fontSize: '14px', color: '#0A1F3D', lineHeight: '1.7', margin: '0 0 6px' }
const detailLabel = { color: '#64748B', fontWeight: 500 }
const detailValue = { color: '#0A1F3D', fontWeight: 600 }
const buttonContainer = { margin: '8px 0 24px' }
const button = {
  backgroundColor: '#0A1F3D',
  color: '#ffffff',
  borderRadius: '8px',
  padding: '12px 24px',
  fontSize: '15px',
  fontWeight: 600,
  textDecoration: 'none',
  display: 'inline-block',
}
const hr = { borderColor: '#E2E8F0', margin: '24px 0' }
const footer = { fontSize: '13px', color: '#6b7280', lineHeight: '1.5', margin: '0 0 8px' }
