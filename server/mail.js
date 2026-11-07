const sender=()=>{const value=(process.env.SMTP_FROM||'').trim();const match=value.match(/^(?:"?([^"<]+)"?\s*)?<([^<>\s]+@[^<>\s]+)>$/);return {email:match?match[2]:value,name:match?.[1]?.trim()||'STAR777'}};
export function mailConfigured(){return Boolean(process.env.BREVO_API_KEY&&process.env.SMTP_FROM&&process.env.OTP_SECRET?.length>=32)}
const escapeHtml=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const layout=(heading,body)=>`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:#eaf2ff;font-family:Arial,sans-serif;color:#142f58"><table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="padding:28px 12px;background:#eaf2ff"><tr><td align="center"><table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:520px;border:2px solid #d7a32c;border-radius:18px;background:#ffffff;overflow:hidden"><tr><td align="center" style="background:#062b63;padding:28px 15px"><div style="font-size:30px;font-weight:bold;color:#f8d16a">★ STAR777</div><div style="color:#ffffff;font-size:13px;margin-top:8px">SECURE ACCOUNT SERVICES</div></td></tr><tr><td style="padding:30px 25px"><h2 style="margin:0 0 18px;color:#10346d">${heading}</h2>${body}</td></tr><tr><td align="center" style="padding:18px;background:#f4f7ff;color:#64748b;font-size:12px">STAR777 • Automated security email<br>Never share your OTP or password.</td></tr></table></td></tr></table></body></html>`;
async function sendEmail(email,subject,textContent,htmlContent){
 if(!mailConfigured())throw new Error('Brevo Email API is not configured');
 const response=await fetch('https://api.brevo.com/v3/smtp/email',{method:'POST',headers:{'api-key':process.env.BREVO_API_KEY,'content-type':'application/json','accept':'application/json'},body:JSON.stringify({sender:sender(),to:[{email}],subject,textContent,htmlContent}),signal:AbortSignal.timeout(15000)});
 if(!response.ok){const detail=(await response.text()).slice(0,400);console.error('Brevo API email rejected',response.status,detail);throw new Error('Brevo email request failed (HTTP '+response.status+')')}
 return true;
}
export function sendOtp(email,code,purpose='reset'){
 const registration=purpose==='register',subject=registration?'STAR777 - Verify your email':'STAR777 - Password reset code';
 const heading=registration?'Verify your email address':'Reset your password';
 const body='<p style="font-size:15px;line-height:1.6">Use this one-time code to '+(registration?'verify your email and create your account.':'reset your STAR777 password.')+'</p><div style="background:#f3f7ff;border:1px solid #e1c06c;border-radius:12px;padding:20px;text-align:center;letter-spacing:7px;font-size:32px;font-weight:bold;color:#073675">'+code+'</div><p style="font-size:14px;line-height:1.6">This code expires in <strong>10 minutes</strong>. If you did not request it, ignore this email.</p>';
 return sendEmail(email,subject,'Your STAR777 '+(registration?'registration':'password reset')+' code is '+code+'. It expires in 10 minutes. Do not share it.',layout(heading,body));
}
export function sendWelcome(email,username){
 const name=escapeHtml(username);
 return sendEmail(email,'Welcome to STAR777!','Welcome to STAR777, '+username+'! Your email has been verified and your account is ready. Keep your password private.',layout('Welcome to STAR777!','<p style="font-size:16px">Hello <strong>'+name+'</strong>,</p><p style="font-size:15px;line-height:1.7">Your email has been verified and your STAR777 account is now ready. Welcome aboard!</p><p style="font-size:14px">For your security, never share your password or verification codes.</p>'));
}
