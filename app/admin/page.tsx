'use client';

import { useRouter } from 'next/navigation'; // <--- AGREGAR ESTO
import { useEffect } from 'react'; // <--- AGREGAR ESTO
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Upload, Plus, Save, Loader2, AlertTriangle } from 'lucide-react';



export default function AdminPage() {

  const router = useRouter(); // <--- AGREGAR ESTO
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');


  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        // Si no hay usuario, fuera de aquí -> Login
        router.push('/login');
      }
    };
    checkUser();
  }, [router]);


  // Estado del Formulario
  const [formData, setFormData] = useState({
    name: '',
    category: 'Zapatos',
    usd_cash_price: '',
    usd_penalty: '0',
    sizes: '',
    image_url: ''
  });

  const [file, setFile] = useState<File | null>(null);

  // 1. Función para subir la imagen al Bucket "shoes"
  const uploadImage = async () => {
    if (!file) return null;
    
    // Nombre único para no sobrescribir fotos
    const fileName = `${Date.now()}-${file.name.replaceAll(' ', '-')}`;
    
    const { data, error } = await supabase.storage
      .from('shoes')
      .upload(fileName, file);

    if (error) throw error;

    // Obtener la URL pública para guardarla en la BD
    const { data: urlData } = supabase.storage
      .from('shoes')
      .getPublicUrl(fileName);
      
    return urlData.publicUrl;
  };

  // 2. Función Guardar Producto
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatus('');

    try {
      let finalImageUrl = formData.image_url;

      // Si hay archivo seleccionado, lo subimos primero
      if (file) {
        setStatus('Subiendo imagen...');
        const uploadedUrl = await uploadImage();
        if (uploadedUrl) finalImageUrl = uploadedUrl;
      }

      setStatus('Guardando en base de datos...');
      
      const { error } = await supabase
        .from('products')
        .insert([{
          name: formData.name,
          category: formData.category,
          usd_cash_price: parseFloat(formData.usd_cash_price),
          usd_penalty: parseFloat(formData.usd_penalty),
          sizes: formData.sizes,
          image_url: finalImageUrl
        }]);

      if (error) throw error;

      setStatus('✅ Producto creado con éxito!');
      // Limpiar form
      setFormData({ name: '', category: 'Zapatos', usd_cash_price: '', usd_penalty: '0', sizes: '', image_url: '' });
      setFile(null);

    } catch (error: any) {
      console.error(error);
      setStatus(`❌ Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 p-6 md:p-12">
      <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-xl border border-zinc-100 overflow-hidden">
        
        {/* Header */}
        <div className="bg-zinc-900 p-6 text-white flex justify-between items-center">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Plus size={24} className="text-blue-400"/>
            Nuevo Producto
          </h1>
          <span className="text-xs bg-zinc-800 px-2 py-1 rounded text-zinc-400">ADMIN MODE</span>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          
          {/* Subida de Imagen */}
          <div className="border-2 border-dashed border-zinc-200 rounded-xl p-6 text-center hover:bg-zinc-50 transition cursor-pointer relative group">
            <input 
              type="file" 
              accept="image/*"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <div className="flex flex-col items-center gap-2 text-zinc-400 group-hover:text-blue-500">
              {file ? (
                <>
                  <span className="font-bold text-zinc-900">{file.name}</span>
                  <span className="text-xs text-green-500">Listo para subir</span>
                </>
              ) : (
                <>
                  <Upload size={32} />
                  <span>Arrastra una foto o haz clic aquí</span>
                </>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-500 uppercase">Nombre del Modelo</label>
              <input 
                required
                type="text" 
                placeholder="Ej: Nike Air Max 90"
                className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition"
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-500 uppercase">Categoría</label>
              <select 
                className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-lg outline-none"
                value={formData.category}
                onChange={e => setFormData({...formData, category: e.target.value})}
              >
                <option>Zapatos</option>
                <option>Accesorios</option>
                <option>Repuestos</option>
              </select>
            </div>
          </div>

          {/* Precios Inteligentes */}
          <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-blue-800 uppercase">Precio Cash ($)</label>
                <div className="relative mt-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">$</span>
                  <input 
                    required
                    type="number" 
                    placeholder="0.00"
                    className="w-full pl-8 p-3 bg-white border border-blue-200 rounded-lg outline-none font-bold text-zinc-900"
                    value={formData.usd_cash_price}
                    onChange={e => setFormData({...formData, usd_cash_price: e.target.value})}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-red-800 uppercase flex items-center gap-1">
                  Penalty / Recargo ($)
                  <AlertTriangle size={12}/>
                </label>
                <div className="relative mt-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">$</span>
                  <input 
                    type="number" 
                    placeholder="0"
                    className="w-full pl-8 p-3 bg-white border border-red-200 rounded-lg outline-none font-bold text-red-600"
                    value={formData.usd_penalty}
                    onChange={e => setFormData({...formData, usd_penalty: e.target.value})}
                  />
                </div>
              </div>
            </div>
            <p className="text-[10px] text-blue-600/70">
              * Si colocas un Penalty mayor a 0, la App mostrará automáticamente la alerta amarilla de "Solo Divisas".
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-500 uppercase">Tallas (Separadas por coma)</label>
            <input 
              type="text" 
              placeholder="38, 39, 40, 41, 42"
              className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-lg outline-none"
              value={formData.sizes}
              onChange={e => setFormData({...formData, sizes: e.target.value})}
            />
          </div>

          {/* Botón de Acción */}
          <button 
            disabled={loading}
            className="w-full bg-zinc-900 text-white font-bold py-4 rounded-xl hover:bg-zinc-800 transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 className="animate-spin" /> : <Save size={20} />}
            {loading ? status : 'Publicar Producto'}
          </button>

          {status && !loading && (
            <p className={`text-center font-medium ${status.includes('Error') ? 'text-red-500' : 'text-green-600'}`}>
              {status}
            </p>
          )}

        </form>
      </div>
    </div>
  );
}