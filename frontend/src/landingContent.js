// Marketing copy for the home page. Edit freely — every number, price and contact detail
// below is SAMPLE content: replace it with your real details before going live.
export const hero = {
  title: ['Manage Your Gym', 'Members, Payments', '& ', 'Renewals', ' Effortlessly'],
  sub: 'A complete gym management system to track members, handle fees, send WhatsApp reminders, and grow your gym.',
  checks: ['Member Management', 'Fee & Renewals', 'WhatsApp Reminders', 'Reports & Analytics'],
}

export const stats = [
  { icon: 'building', value: '500+', label: 'Gyms Trust Us' },
  { icon: 'users', value: '1L+', label: 'Members Managed' },
  { icon: 'target', value: '98%', label: 'Renewal Tracking' },
  { icon: 'clock', value: '24/7', label: 'Support' },
]

export const features = [
  { icon: 'users', title: 'Member management', text: 'Profiles with batch, trainer and emergency contact. Find anyone by name, phone or member ID in seconds.' },
  { icon: 'camera', title: 'Photo identification', text: 'Add a photo at sign-up — upload or snap it with a phone camera — so your front desk can tell members apart at a glance.' },
  { icon: 'wallet', title: 'Fees & balances', text: 'Record full or part payments, collect balances later, and keep a receipt trail across cash, UPI and card.' },
  { icon: 'calendar', title: 'Renewal tracking', text: 'See who expires this week and who already has. Renew in two taps — dates are worked out for you.' },
  { icon: 'whatsapp', title: 'WhatsApp reminders', text: 'One-click messages in English or தமிழ், pre-filled with the member’s name, plan, date and amount due.' },
  { icon: 'chart', title: 'Reports & analytics', text: 'Monthly collection, members by plan and pending fees — your gym’s numbers on a single screen.' },
]

export const steps = [
  { title: 'Add a member', text: 'Name, number, photo, plan and first payment — under a minute at the front desk.' },
  { title: 'Track fees & renewals', text: 'FitTrack works out end dates and balances and flags who needs a nudge.' },
  { title: 'Remind & get paid', text: 'Send a pre-written WhatsApp message in one click and mark the payment when it arrives.' },
]

export const pricing = [
  { name: 'Starter', price: '₹0', per: 'forever', note: 'For a small studio getting started', features: ['Up to 50 members', 'Fees & renewal tracking', 'Member photos', 'One-click WhatsApp reminders'], cta: 'Start free' },
  { name: 'Growth', price: '₹499', per: '/ month', note: 'For a busy single-branch gym', features: ['Unlimited members', 'Reports & analytics', 'English + தமிழ் reminder templates', 'Priority support'], cta: 'Get started', featured: true },
  { name: 'Pro', price: '₹999', per: '/ month', note: 'For growing gym chains', features: ['Everything in Growth', 'Multiple branches', 'Staff accounts', 'Onboarding help'], cta: 'Get started' },
]

export const faqs = [
  { q: 'Where is my data stored?', a: 'In a SQLite database file on your own computer or server (the DB folder). Nothing is sent to a third party, and you can back it up by copying one file.' },
  { q: 'Do I need WhatsApp Business to send reminders?', a: 'No. One-click mode opens WhatsApp with the message already typed — you only press send. Fully automatic sending needs a WhatsApp Business API provider.' },
  { q: 'Can I use it from my phone?', a: 'Yes. The whole app is responsive, and on a phone the “Take photo” button opens the camera so you can capture a new member on the spot.' },
  { q: 'Which languages are the reminder messages in?', a: 'English and தமிழ் templates are built in, and you can edit the text before sending.' },
]

export const contact = {
  email: 'hello@fittrack.example',
  phone: '+91 90000 00000',
  address: 'Your gym or office address',
}
