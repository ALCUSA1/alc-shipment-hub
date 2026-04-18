/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface InviteEmailProps {
  siteName: string
  siteUrl: string
  confirmationUrl: string
}

export const InviteEmail = ({ siteUrl, confirmationUrl }: InviteEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>You've been invited to ALC Shipper Portal</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Text style={brand}>ALC Shipper Portal</Text>
        </Section>
        <Heading style={h1}>You've been invited</Heading>
        <Text style={text}>
          You've been invited to join your team on{' '}
          <Link href={siteUrl} style={link}>
            <strong>ALC Shipper Portal</strong>
          </Link>
          . Accept your invitation and create your account to start managing shipments together.
        </Text>
        <Section style={buttonWrap}>
          <Button style={button} href={confirmationUrl}>
            Accept invitation
          </Button>
        </Section>
        <Text style={footer}>
          If you weren't expecting this invitation, you can safely ignore this email.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default InviteEmail

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif" }
const container = { padding: '32px 28px', maxWidth: '560px' }
const header = { borderBottom: '1px solid #e5eaf0', paddingBottom: '16px', marginBottom: '28px' }
const brand = { fontSize: '14px', fontWeight: 700 as const, color: '#0A1F3D', letterSpacing: '0.5px', margin: 0 }
const h1 = { fontSize: '24px', fontWeight: 700 as const, color: '#0A1F3D', margin: '0 0 16px', letterSpacing: '-0.01em' }
const text = { fontSize: '15px', color: '#475569', lineHeight: '1.6', margin: '0 0 20px' }
const link = { color: '#2C7BF2', textDecoration: 'none' }
const buttonWrap = { margin: '28px 0' }
const button = {
  backgroundColor: '#0A1F3D',
  color: '#ffffff',
  fontSize: '15px',
  fontWeight: 600 as const,
  borderRadius: '8px',
  padding: '14px 28px',
  textDecoration: 'none',
  display: 'inline-block',
}
const footer = { fontSize: '13px', color: '#94a3b8', margin: '32px 0 0', borderTop: '1px solid #e5eaf0', paddingTop: '20px' }
