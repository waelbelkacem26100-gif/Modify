const SHOP = 'modify-test-dk5gaell.myshopify.com'
const TOKEN = 'shpua_546cb1a88a7f9aadd329a52d89703065'
const API = `https://${SHOP}/admin/api/2024-10`

const headers = {
  'X-Shopify-Access-Token': TOKEN,
  'Content-Type': 'application/json',
}

const products = [
  {
    title: 'Montre Minimaliste Noire',
    vendor: 'Modify Store',
    product_type: 'Accessoires',
    status: 'active',
    variants: [{ price: '89.99', inventory_management: null }],
    images: [{ src: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800' }],
  },
  {
    title: 'Sac à Dos Urban',
    vendor: 'Modify Store',
    product_type: 'Bagagerie',
    status: 'active',
    variants: [{ price: '129.00', inventory_management: null }],
    images: [{ src: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800' }],
  },
  {
    title: 'Sneakers Blanches Classic',
    vendor: 'Modify Store',
    product_type: 'Chaussures',
    status: 'active',
    variants: [
      { option1: '38', price: '79.99', inventory_management: null },
      { option1: '39', price: '79.99', inventory_management: null },
      { option1: '40', price: '79.99', inventory_management: null },
      { option1: '41', price: '79.99', inventory_management: null },
    ],
    options: [{ name: 'Taille', values: ['38', '39', '40', '41'] }],
    images: [{ src: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800' }],
  },
  {
    title: 'Casquette Logo Brodé',
    vendor: 'Modify Store',
    product_type: 'Coiffure',
    status: 'active',
    variants: [{ price: '34.90', compare_at_price: '49.90', inventory_management: null }],
    images: [{ src: 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=800' }],
  },
  {
    title: 'Sweatshirt Oversize',
    vendor: 'Modify Store',
    product_type: 'Vêtements',
    status: 'active',
    variants: [
      { option1: 'S', price: '59.99', inventory_management: null },
      { option1: 'M', price: '59.99', inventory_management: null },
      { option1: 'L', price: '59.99', inventory_management: null },
    ],
    options: [{ name: 'Taille', values: ['S', 'M', 'L'] }],
    images: [{ src: 'https://images.unsplash.com/photo-1556821840-3a63f15732ce?w=800' }],
  },
]

async function createProduct(product) {
  const res = await fetch(`${API}/products.json`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ product }),
  })
  const data = await res.json()
  if (data.product) {
    console.log(`✓ Produit créé : ${data.product.title} (id: ${data.product.id})`)
  } else {
    console.error(`✗ Erreur produit ${product.title}:`, JSON.stringify(data.errors))
  }
  return data.product
}

async function createPage(page) {
  const res = await fetch(`${API}/pages.json`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ page }),
  })
  const data = await res.json()
  if (data.page) {
    console.log(`✓ Page créée : ${data.page.title} (id: ${data.page.id})`)
  } else {
    console.error(`✗ Erreur page:`, JSON.stringify(data.errors))
  }
}

console.log('Seeding boutique Shopify de test...\n')

for (const product of products) {
  await createProduct(product)
  await new Promise(r => setTimeout(r, 500)) // rate limit
}

await createPage({
  title: 'À propos',
  body_html: '',
  published: true,
})

console.log('\nDone.')
