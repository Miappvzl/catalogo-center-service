import ProductEditor from '@/components/ProductEditor'

// En Next.js 15, params es una Promise
export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  // 1. Desempaquetamos el ID con await
  const { id } = await params 

  // 2. Se lo pasamos al editor
  return <ProductEditor productId={id} /> 
}