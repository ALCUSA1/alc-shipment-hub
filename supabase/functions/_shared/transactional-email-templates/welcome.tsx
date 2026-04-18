import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'ALC Shipper Portal'
const SITE_URL = 'https://alllogisticscargo.com'

interface WelcomeProps {
  name?: string
}

const WelcomeEmail = ({ name }: WelcomeProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Welcome to {SITE_NAME} — let's get your first shipment moving</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>
          {name ? `Welcome, ${name}!` : 'Welcome to ALC Shipper Portal'}
        </Heading>
        <Text style={text}>
          You now have access to a modern logistics workspace built to simplify
          quoting, booking, and tracking your shipments — all in one place.
        </Text>
        <Text style={text}>Here's what you can do next:</Text>
        <Section style={list}>
          <Text style={listItem}>• Search live freight rates across ocean, air, and trucking</Text>
          <Text style={listItem}>• Create your first shipment in just a few steps</Text>
          <Text style={listItem}>• Upload commercial invoices, packing lists, and customs documents</Text>
          <Text style={listItem}>• Track milestones and collaborate with your team in real time</Text>
        </Section>
        <Section style={buttonContainer}>
          <Button href={`${SITE_URL}/dashboard`} style={button}>
            Open your dashboard
          </Button>
        </Section>
        <Text style={footer}>
          Need help getting started? Just reply to this email — our team is here to help.
        </Text>
        <Text style={footer}>— The {SITE_NAME} Team</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: WelcomeEmail,
  subject: 'Welcome to ALC Shipper Portal',
  displayName: 'Welcome email',
  previewData: { name: 'Jane' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Inter, Arial, sans-serif' }
const container = { padding: '32px 28px', maxWidth: '560px', margin: '0 auto' }
const h1 = { fontSize: '24px', fontWeight: 700, color: '#0A1F3D', margin: '0 0 20px' }
const text = { fontSize: '15px', color: '#374151', lineHeight: '1.6', margin: '0 0 16px' }
const list = { margin: '8px 0 24px' }
const listItem = { fontSize: '14px', color: '#374151', lineHeight: '1.7', margin: '0 0 4px' }
const buttonContainer = { margin: '28px 0' }
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
const footer = { fontSize: '13px', color: '#6b7280', lineHeight: '1.5', margin: '0 0 8px' }
