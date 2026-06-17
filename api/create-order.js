export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { amount } = req.body;
  if (!amount) return res.status(400).json({ error: 'Amount required' });

  const auth = Buffer.from(
    `${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_SECRET}`
  ).toString('base64');

  const response = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount: amount * 100, // paise
      currency: 'INR',
      receipt: `dg_${Date.now()}`,
    }),
  });

  const order = await response.json();
  if (!response.ok) return res.status(500).json({ error: order.error?.description || 'Order creation failed' });

  res.status(200).json(order);
}
