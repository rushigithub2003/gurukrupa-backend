// seed.js — Populates MongoDB with admin user, categories, and sample products
require('dotenv').config();
const mongoose = require('mongoose');
const Admin    = require('./models/Admin');
const Category = require('./models/Category');
const Product  = require('./models/Product');

const categories = [
  { name: 'Printers', slug: 'printers', icon: '🖨️', description: 'Laser and inkjet printers for every office need' },
  { name: 'Scanners', slug: 'scanners', icon: '📠', description: 'High-speed document and flatbed scanners' },
  { name: 'Projectors', slug: 'projectors', icon: '📽️', description: 'Conference room and classroom projectors' },
  { name: 'Copiers & MFPs', slug: 'copiers-mfps', icon: '📋', description: 'Multifunction printers for print, scan, copy, fax' },
  { name: 'Office Chairs', slug: 'office-chairs', icon: '🪑', description: 'Ergonomic and executive office chairs' },
  { name: 'Accessories', slug: 'accessories', icon: '🔌', description: 'Monitors, keyboards, hubs, and desk accessories' },
];

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  // Clear existing data
  await Promise.all([Admin.deleteMany(), Category.deleteMany(), Product.deleteMany()]);
  console.log('Cleared existing data');

  // Create admin
  await Admin.create({
    name: 'Super Admin',
    email: process.env.ADMIN_EMAIL || 'admin@gurukrupa.com',
    password: process.env.ADMIN_PASSWORD || 'Admin@123',
  });
  console.log('✅ Admin created:', process.env.ADMIN_EMAIL);

  // Create categories
  const cats = await Category.insertMany(categories);
  console.log('✅ Categories created:', cats.length);

  // Map category names to IDs
  const catMap = {};
  cats.forEach(c => { catMap[c.name] = c._id; });

  // Sample products
  const sampleProducts = [
    {
      name: 'HP LaserJet Pro M404dn', brand: 'HP', category: catMap['Printers'],
      description: 'High-speed monochrome laser printer for busy offices. Handles high-volume workloads with crisp output.',
      shortSpecs: ['38 ppm Mono Laser', 'Auto Duplex Printing', 'USB + Ethernet'],
      features: ['38 pages per minute', 'Auto two-sided printing', 'JetIntelligence toner technology', '250-sheet input tray'],
      specs: new Map([['Print Speed', '38 ppm'], ['Resolution', '1200 × 1200 dpi'], ['Connectivity', 'USB 2.0, Ethernet'], ['Paper Capacity', '250 sheets']]),
      image: 'https://images.unsplash.com/photo-1612198188060-c7c2a3b66eae?w=500&q=80',
      isFeatured: true,
    },
    {
      name: 'Epson EcoTank L3250', brand: 'Epson', category: catMap['Printers'],
      description: 'Ultra-low-cost color printing with revolutionary refillable ink tank system.',
      shortSpecs: ['Color Inkjet • 33ppm', 'Wi-Fi + USB', 'Tank Refill System'],
      features: ['Refillable ink tank', 'Print, scan, copy', 'Wi-Fi connectivity', '4,500 pages per black bottle'],
      specs: new Map([['Print Speed', '33 ppm mono'], ['Resolution', '5760 × 1440 dpi'], ['Connectivity', 'Wi-Fi, USB']]),
      image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=500&q=80',
      isFeatured: true,
    },
    {
      name: 'Canon imageCLASS MF445dw', brand: 'Canon', category: catMap['Printers'],
      description: '4-in-1 mono laser printer with wireless connectivity and colour touchscreen.',
      shortSpecs: ['Laser MFP • 38ppm', 'Duplex + Wi-Fi', '5" Touch Display'],
      features: ['4-in-1: Print, Copy, Scan, Fax', '5" colour LCD', 'AirPrint & Mopria support', '50-sheet Duplex ADF'],
      specs: new Map([['Print Speed', '38 ppm'], ['Resolution', '600 × 600 dpi'], ['Paper Capacity', '300 sheets']]),
      image: 'https://images.unsplash.com/photo-1612198188060-c7c2a3b66eae?w=500&q=80',
    },
    {
      name: 'Epson WorkForce DS-530', brand: 'Epson', category: catMap['Scanners'],
      description: 'Fast duplex document scanner for high-volume business scanning needs.',
      shortSpecs: ['35 ppm Duplex Scan', '50-Sheet ADF', 'USB 3.0'],
      features: ['35 ppm / 70 ipm duplex', '50-sheet auto document feeder', 'Scan to cloud', 'Double-feed detection'],
      specs: new Map([['Scan Speed', '35 ppm / 70 ipm'], ['Resolution', '600 dpi'], ['ADF Capacity', '50 sheets']]),
      image: 'https://images.unsplash.com/photo-1586953208270-15a5c5aef0c1?w=500&q=80',
      isFeatured: true,
    },
    {
      name: 'Fujitsu ScanSnap iX1500', brand: 'Fujitsu', category: catMap['Scanners'],
      description: 'Intelligent document scanner with colour touchscreen for effortless scanning.',
      shortSpecs: ['30 ppm Color', 'Touchscreen Interface', 'Wi-Fi + USB'],
      features: ['4.3" colour touchscreen', '30 ppm colour duplex', '50-sheet ADF', 'Cloud connectivity'],
      specs: new Map([['Scan Speed', '30 ppm'], ['ADF Capacity', '50 sheets'], ['Interface', 'Wi-Fi, USB 3.1']]),
      image: 'https://images.unsplash.com/photo-1586953208270-15a5c5aef0c1?w=500&q=80',
    },
    {
      name: 'Epson EB-X51 Projector', brand: 'Epson', category: catMap['Projectors'],
      description: 'Bright and reliable XGA projector ideal for conference rooms and classrooms.',
      shortSpecs: ['3800 Lumens', 'XGA 1024×768', 'HDMI + VGA'],
      features: ['3800 lumens brightness', 'XGA resolution', 'HDMI & VGA inputs', '10,000 hr lamp life'],
      specs: new Map([['Brightness', '3,800 lumens'], ['Resolution', '1024 × 768 (XGA)'], ['Contrast', '15,000:1']]),
      image: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=500&q=80',
      isFeatured: true,
    },
    {
      name: 'BenQ MW560 WXGA Projector', brand: 'BenQ', category: catMap['Projectors'],
      description: 'High-brightness widescreen projector with SmartEco energy-saving technology.',
      shortSpecs: ['4000 Lumens', 'WXGA 1280×800', 'SmartEco Mode'],
      features: ['4000 ANSI lumens', 'SmartEco energy saving', 'DLP technology', 'Auto vertical keystone'],
      specs: new Map([['Brightness', '4,000 lumens'], ['Resolution', '1280 × 800 (WXGA)'], ['Weight', '2.5 kg']]),
      image: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=500&q=80',
    },
    {
      name: 'Ricoh IM 2702 Mono MFP', brand: 'Ricoh', category: catMap['Copiers & MFPs'],
      description: 'Fast A4 monochrome multifunction with intuitive touchscreen and robust security.',
      shortSpecs: ['27 ppm A4 Mono', '10.1" Smart Panel', 'Network Ready'],
      features: ['Print, Copy, Scan, Fax', '10.1" Smart Operation Panel', '350-sheet paper supply'],
      specs: new Map([['Print Speed', '27 ppm'], ['Resolution', '1200 × 1200 dpi'], ['Paper Capacity', '350 sheets']]),
      image: 'https://images.unsplash.com/photo-1626379953822-baec19c3accd?w=500&q=80',
      isFeatured: true,
    },
    {
      name: 'Godrej Interio Apex High Back', brand: 'Godrej', category: catMap['Office Chairs'],
      description: 'Premium ergonomic office chair for all-day comfort and productivity.',
      shortSpecs: ['High-Back Ergonomic', 'Lumbar Support', '360° Swivel'],
      features: ['High backrest with headrest', 'Adjustable lumbar support', 'Pneumatic height adjustment', 'Mesh back'],
      specs: new Map([['Back Type', 'High Back Mesh'], ['Weight Capacity', '120 kg'], ['Armrests', '3D Adjustable']]),
      image: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=500&q=80',
    },
    {
      name: 'Logitech MX Keys Business', brand: 'Logitech', category: catMap['Accessories'],
      description: 'Premium wireless keyboard with smart backlighting and multi-device switching.',
      shortSpecs: ['Multi-Device Pairing', 'Backlit Keys', 'USB-C Charging'],
      features: ['Connect up to 3 devices', 'Backlit with proximity sensor', 'USB-C rechargeable', 'Works on all OS'],
      specs: new Map([['Connectivity', 'Bluetooth / Logi Bolt'], ['Battery Life', '5 months'], ['Layout', 'Full-size with numpad']]),
      image: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=500&q=80',
      isFeatured: true,
    },
  ];

  await Product.insertMany(sampleProducts);
  console.log('✅ Sample products created:', sampleProducts.length);

  console.log('\n🎉 Database seeded successfully!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Admin login:');
  console.log('  Email:   ', process.env.ADMIN_EMAIL || 'admin@gurukrupa.com');
  console.log('  Password:', process.env.ADMIN_PASSWORD || 'Admin@123');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  process.exit(0);
}

seed().catch(err => { console.error(err); process.exit(1); });