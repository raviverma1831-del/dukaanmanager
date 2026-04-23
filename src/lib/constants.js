export const BIZ_TYPES = [
  { id: 'kirana',   emoji: '🛒', label: 'Kirana / General Store' },
  { id: 'beauty',   emoji: '💄', label: 'Beauty Parlor / Salon' },
  { id: 'cosmetic', emoji: '✨', label: 'Cosmetic & Gift Shop' },
  { id: 'bakery',   emoji: '🎂', label: 'Bakery / Mithai Shop' },
  { id: 'medical',  emoji: '💊', label: 'Medical / Pharmacy' },
  { id: 'cloth',    emoji: '👗', label: 'Cloth / Garment Shop' },
  { id: 'hardware', emoji: '🔧', label: 'Hardware Store' },
  { id: 'custom',   emoji: '⚙️', label: 'Custom Business' },
]

export const PRESET_CATEGORIES = {
  kirana:   ['Grains','Oil','Masala','Dairy','Cleaning','Snacks','Beverages','Personal Care'],
  beauty:   ['Hair Services','Skin Services','Nail Care','Threading','Waxing','Products'],
  cosmetic: ['Makeup','Skincare','Haircare','Fragrances','Gifts','Accessories'],
  bakery:   ['Breads','Cakes','Cookies','Pastries','Sweets','Beverages'],
  medical:  ['Medicines','Vitamins','Surgical','Baby Care','OTC'],
  cloth:    ['Sarees','Suits','Kids Wear','Mens Wear','Fabrics'],
  hardware: ['Cement','Paint','Pipes','Tools','Electrical','Sanitary'],
  custom:   ['Category 1','Category 2','Category 3'],
}

export const PRESET_PRODUCTS = {
  kirana: [
    { name:'Aashirvaad Atta 5kg', category:'Grains',  retail_price:245, wholesale_price:230, stock:20, unit:'bag', min_stock:5 },
    { name:'Sugar 1kg',           category:'Grains',  retail_price:48,  wholesale_price:44,  stock:50, unit:'kg',  min_stock:10 },
    { name:'Fortune Oil 1L',      category:'Oil',     retail_price:155, wholesale_price:148, stock:18, unit:'btl', min_stock:6 },
    { name:'Tata Salt 1kg',       category:'Masala',  retail_price:28,  wholesale_price:25,  stock:40, unit:'pkt', min_stock:10 },
    { name:'Parle-G 250g',        category:'Snacks',  retail_price:30,  wholesale_price:27,  stock:50, unit:'pkt', min_stock:15 },
    { name:'Maggi 12pk',          category:'Snacks',  retail_price:144, wholesale_price:136, stock:18, unit:'box', min_stock:5 },
    { name:'Amul Butter 500g',    category:'Dairy',   retail_price:270, wholesale_price:260, stock:12, unit:'pkt', min_stock:5 },
    { name:'Toor Dal 1kg',        category:'Grains',  retail_price:145, wholesale_price:138, stock:15, unit:'pkt', min_stock:8 },
    { name:'Colgate 200g',        category:'Personal Care', retail_price:88, wholesale_price:80, stock:30, unit:'pcs', min_stock:10 },
  ],
  beauty: [
    { name:'Haircut Ladies', category:'Hair Services', retail_price:150, wholesale_price:150, stock:999, unit:'svc', min_stock:0, is_service:true },
    { name:'Facial Basic',   category:'Skin Services', retail_price:350, wholesale_price:350, stock:999, unit:'svc', min_stock:0, is_service:true },
    { name:'Threading Eyebrow', category:'Threading',  retail_price:40,  wholesale_price:40,  stock:999, unit:'svc', min_stock:0, is_service:true },
    { name:'Full Arms Waxing',  category:'Waxing',     retail_price:250, wholesale_price:250, stock:999, unit:'svc', min_stock:0, is_service:true },
    { name:'Manicure',          category:'Nail Care',  retail_price:300, wholesale_price:300, stock:999, unit:'svc', min_stock:0, is_service:true },
  ],
  cosmetic: [
    { name:'Lakme Lipstick',   category:'Makeup',     retail_price:350, wholesale_price:320, stock:20, unit:'pcs', min_stock:5 },
    { name:'Nivea Face Cream', category:'Skincare',   retail_price:180, wholesale_price:165, stock:15, unit:'pcs', min_stock:4 },
    { name:'Body Mist 150ml',  category:'Fragrances', retail_price:280, wholesale_price:260, stock:8,  unit:'btl', min_stock:3 },
    { name:'Gift Box Medium',  category:'Gifts',      retail_price:450, wholesale_price:420, stock:10, unit:'pcs', min_stock:2 },
  ],
  bakery: [
    { name:'Bread Loaf',          category:'Breads',  retail_price:40,  wholesale_price:35,  stock:30, unit:'pcs', min_stock:10 },
    { name:'Chocolate Cake 500g', category:'Cakes',   retail_price:380, wholesale_price:350, stock:8,  unit:'pcs', min_stock:3 },
    { name:'Butter Cookies 250g', category:'Cookies', retail_price:120, wholesale_price:110, stock:20, unit:'pkt', min_stock:5 },
    { name:'Gulab Jamun 500g',    category:'Sweets',  retail_price:180, wholesale_price:165, stock:12, unit:'pkt', min_stock:4 },
  ],
  medical: [
    { name:'Paracetamol 500mg', category:'Medicines', retail_price:25,  wholesale_price:22,  stock:100, unit:'strip', min_stock:20 },
    { name:'Vitamin C 500mg',   category:'Vitamins',  retail_price:120, wholesale_price:110, stock:30,  unit:'btl',   min_stock:5 },
    { name:'Bandage Roll',      category:'Surgical',  retail_price:45,  wholesale_price:40,  stock:50,  unit:'pcs',   min_stock:10 },
  ],
  cloth: [
    { name:'Cotton Saree',    category:'Sarees',   retail_price:850,  wholesale_price:800,  stock:25, unit:'pcs', min_stock:5 },
    { name:'Salwar Suit Set', category:'Suits',    retail_price:1200, wholesale_price:1100, stock:15, unit:'set', min_stock:3 },
  ],
  hardware: [
    { name:'Cement 50kg',    category:'Cement', retail_price:420, wholesale_price:400, stock:50, unit:'bag', min_stock:10 },
    { name:'Asian Paint 1L', category:'Paint',  retail_price:280, wholesale_price:265, stock:20, unit:'tin', min_stock:5 },
  ],
  custom: [],
}

export const C = {
  g:'#16a34a', gD:'#14532d', gL:'#15803d', gXL:'#dcfce7', gBg:'#f0fdf4',
  blue:'#1d4ed8', blueL:'#dbeafe',
  gold:'#d97706', goldL:'#fef3c7',
  red:'#dc2626', redL:'#fee2e2',
  muted:'#6b7280', text:'#1c2b20', card:'#ffffff', bg:'#f0fdf4',
  border:'#d1fae5',
}
