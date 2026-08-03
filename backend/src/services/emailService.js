const nodemailer = require('nodemailer');

let transporter = null;

const getTransporter = async () => {
  if (transporter) return transporter;

  const host = process.env.EMAIL_HOST;
  const user = process.env.EMAIL_USER;

  if (host && user) {
    transporter = nodemailer.createTransport({
      host,
      port: parseInt(process.env.EMAIL_PORT || '587'),
      secure: process.env.EMAIL_SECURE === 'true',
      auth: {
        user,
        pass: process.env.EMAIL_PASS,
      },
    });
    try {
      await transporter.verify();
      console.log('Email transporter ready');
    } catch (err) {
      console.warn('Email transporter verification failed, using console fallback:', err.message);
      transporter = null;
    }
  }

  return transporter;
};

exports.sendVerificationCode = async (email, code, name) => {
  const transport = await getTransporter();

  console.log('========================================');
  console.log(`VERIFICATION CODE for ${email}: ${code}`);
  console.log(`User: ${name}`);
  console.log('========================================');

  if (transport) {
    try {
      await transport.sendMail({
        from: `"Agri-Link Rwanda" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: 'Verify Your Email - Agri-Link Rwanda',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; background: #f0fdf4; border-radius: 16px;">
            <div style="text-align: center; margin-bottom: 24px;">
              <h1 style="color: #166534; margin: 0; font-size: 24px;">Agri-Link Rwanda</h1>
              <p style="color: #16a34a; margin: 4px 0 0;">Email Verification</p>
            </div>
            <div style="background: white; padding: 32px; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
              <p style="color: #374151; font-size: 16px; margin: 0 0 16px;">Hello <strong>${name}</strong>,</p>
              <p style="color: #374151; font-size: 14px; margin: 0 0 20px;">Use the code below to verify your email address. This code expires in <strong>15 minutes</strong>.</p>
              <div style="text-align: center; margin: 24px 0; padding: 16px; background: #f0fdf4; border-radius: 8px; border: 2px dashed #16a34a;">
                <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #166534;">${code}</span>
              </div>
              <p style="color: #6b7280; font-size: 12px; margin: 16px 0 0;">If you did not create an account, please ignore this email.</p>
            </div>
          </div>
        `,
      });
      console.log(`Verification email sent to ${email}`);
    } catch (err) {
      console.error('Failed to send verification email:', err.message);
    }
  }
  console.log('Using console fallback — set EMAIL_HOST/EMAIL_USER/EMAIL_PASS in .env for real email delivery');
};
