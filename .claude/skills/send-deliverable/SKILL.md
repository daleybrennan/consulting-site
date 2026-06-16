---
name: send-deliverable
description: Draft the covering email that sends a finished diagnostic or strategy PDF to the client, in Daley's voice and the brand tone, for Daley to review and send. Use after a deliverable PDF is rendered and signed off.
---

# Draft the covering email

Prepares a Gmail **draft** (never sends — Daley sends) that accompanies a finished PDF.

## Inputs
Client name + email, which deliverable (diagnostic = free, strategy = paid), the PDF path in `out/`, the headline finding (expected shelf / the gap), and `preferred_language`.

## Compose
- **Subject:** diagnostic → `Your Pricing Diagnostic — {{WINE}}`; strategy → `Your Market-Entry Pricing Strategy — {{WINE}}`.
- **Tone:** match the website — warm, precise, premium, first person ("I"). Short. For the diagnostic, the email's job is to deliver value *and* open the door to the paid strategy without hard-selling. For the strategy, it's a confident handover of commissioned work.
- If `preferred_language` is `fr`, write the email in French.
- Sign as Daley Brennan · The Place & Market · daleybrennan@gmail.com.

## Attach
Create the draft with `mcp__claude_ai_Gmail__create_draft`:
- `to`: client email · `subject` · `body` (plain) and optionally `htmlBody`.
- **Attachment:** read the PDF from `out/`, base64-encode it, pass in `attachments` (`filename`, `mimeType: application/pdf`, `content`). PDFs here are well under the 25MB limit.
- **Fallback** if attachment is rejected: omit it, upload the PDF to Drive, and put the Drive share link in the body — and tell Daley to attach the file manually.

## Rule
Always create a **draft**. Never call a send tool. Hand the draft ID back to Daley to review, adjust, and send himself — the personal touch is the product.
