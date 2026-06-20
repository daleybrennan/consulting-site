/**
 * The instant "I've received your request" email a prospect gets the moment
 * they submit the intake form. Warm, first-person, brand voice — it reassures
 * them during the wait before Daley sends the diagnostic. Localized EN/FR.
 */

interface AckInput {
  locale: 'en' | 'fr';
  contactName: string;
  companyName: string;
  isSpeaking?: boolean;
}

export function acknowledgmentEmail({
  locale,
  contactName,
  companyName,
  isSpeaking = false,
}: AckInput): { subject: string; text: string } {
  const firstName = contactName.trim().split(/\s+/)[0] || contactName;

  if (isSpeaking) {
    if (locale === 'fr') {
      return {
        subject: `Merci pour votre message — ${companyName}`,
        text: [
          `Bonjour ${firstName},`,
          '',
          `Merci d'avoir pensé à moi pour une intervention ou une formation. J'ai bien reçu votre message et je reviendrai vers vous personnellement pour en discuter.`,
          '',
          `Si vous souhaitez ajouter des détails entre-temps, il vous suffit de répondre à ce message.`,
          '',
          'Bien à vous,',
          'Daley Brennan',
          'Export Consultant',
          'daley@daleybrennan.com',
        ].join('\n'),
      };
    }
    return {
      subject: `Thank you for getting in touch — ${companyName}`,
      text: [
        `Hi ${firstName},`,
        '',
        `Thank you for thinking of me for a speaking or training engagement. I've received your message and will be in touch personally to talk it through.`,
        '',
        `If you'd like to add any details in the meantime, just reply to this email.`,
        '',
        'Best regards,',
        'Daley Brennan',
        'Export Consultant',
        'daley@daleybrennan.com',
      ].join('\n'),
    };
  }

  if (locale === 'fr') {
    return {
      subject: `J'ai bien reçu votre demande — ${companyName}`,
      text: [
        `Bonjour ${firstName},`,
        '',
        `Merci — j'ai bien reçu votre demande concernant ${companyName}.`,
        '',
        `Je prépare personnellement un diagnostic tarifaire et vous reviendrai sous peu. Si vous souhaitez ajouter quoi que ce soit entre-temps, il vous suffit de répondre à ce message.`,
        '',
        'Bien à vous,',
        'Daley Brennan',
        'Export Consultant',
        'daley@daleybrennan.com',
      ].join('\n'),
    };
  }

  return {
    subject: `I've received your request — ${companyName}`,
    text: [
      `Hi ${firstName},`,
      '',
      `Thank you — I've received your request for ${companyName}.`,
      '',
      `I prepare each pricing diagnostic personally and will be in touch shortly. If there's anything you'd like to add in the meantime, just reply to this email.`,
      '',
      'Best regards,',
      'Daley Brennan',
      'Export Consultant',
      'daley@daleybrennan.com',
    ].join('\n'),
  };
}
