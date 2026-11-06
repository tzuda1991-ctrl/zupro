const sender=()=>{const value=(process.env.SMTP_FROM||'').trim();const match=value.match(/^(?:"?([^"<]+)"?\s*)?<([^<>\s]+@[^<>\s]+)>$/);return {email:match?match[2]:value,name:match?.[1]?.trim()||'STAR777'}};
export function mailConfigured(){return Boolean(process.env.BREVO_API_KEY&&process.env.SMTP_FROM&&process.env.OTP_SECRET?.length>=32)}
export async function sendOtp(email,code){
 if(!mailConfigured())throw new Error('Brevo Email API is not configured');
 const response=await fetch('https://api.brevo.com/v3/smtp/email',{
  method:'POST',
  headers:{'api-key':process.env.BREVO_API_KEY,'content-type':'application/json','accept':'application/json'},
  body:JSON.stringify({sender:sender(),to:[{email}],subject:'STAR777 password reset OTP',textContent:'Your STAR777 password reset code is '+code+'. It expires in 10 minutes. If you did not request it, ignore this message.'}),
  signal:AbortSignal.timeout(15000)
 });
 if(!response.ok){const detail=(await response.text()).slice(0,400);console.error('Brevo API email rejected',response.status,detail);throw new Error('Brevo email delivery request failed (HTTP '+response.status+')')}
 return true;
}
