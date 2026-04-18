/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface ReauthenticationEmailProps {
  token: string
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your ALC Shipper Portal verification code</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Text style={brand}>ALC Shipper Portal</Text>
        </Section>
        <Heading style={h1}>Confirm it's you</Heading>
        <Text style={text}>Use the verification code below to confirm your identity:</Text>
        <Text style={codeStyle}>{token}</Text>
        <Text style={footer}>
          This code expires shortly. If you didn't request it, you can safely ignore this email.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default ReauthenticationEmail

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif" }
const container = { padding: '32px 28px', maxWidth: '560px' }
const header = { borderBottom: '1px solid #e5eaf0', paddingBottom: '16px', marginBottom: '28px' }
const brand = { fontSize: '14px', fontWeight: 700 as const, color: '#0A1F3D', letterSpacing: '0.5px', margin: 0 }
const h1 = { fontSize: '24px', fontWeight: 700 as const, color: '#0A1F3D', margin: '0 0 16px', letterSpacing: '-0.01em' }
const text = { fontSize: '15px', color: '#475569', lineHeight: '1.6', margin: '0 0 20px' }
const codeStyle = {
  fontFamily: "'SF Mono', Menlo, Consolas, monospace",
  fontSize: '28px',
  fontWeight: 700 as const,
  color: '#0A1F3D',
  letterSpacing: '6px',
  backgroundColor: '#f1f5f9',
  padding: '16px 24px',
  borderRadius: '8px',
  display: 'inline-block',
  margin: '0 0 28px',
}
const footer = { fontSize: '13px', color: '#94a3b8', margin: '32px 0 0', borderTop: '1px solid #e5eaf0', paddingTop: '20px' }
