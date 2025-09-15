import { NextResponse } from 'next/server';
export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const { to, body } = await req.json();
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_FROM) {
      return NextResponse.json({ error: 'Missing Twilio env vars' }, { status: 500 });
    }
    if (!to || !body) {
      return NextResponse.json({ error: 'Provide { to, body }' }, { status: 400 });
    }
    const twilio = (await import('twilio')).default as any;
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    const targets: string[] = Array.isArray(to) ? to : [to];
    const results: any[] = [];
    for (const phone of targets) {
      const res = await client.messages.create({
        from: process.env.TWILIO_FROM!,
        to: phone,
        body,
      });
      results.push({ to: phone, sid: res.sid, status: res.status });
    }
    return NextResponse.json({ ok: true, sent: results.length, results });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'SMS error' }, { status: 500 });
  }
}
