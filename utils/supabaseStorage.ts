// utils/supabaseStorage.ts
import { SupabaseClient } from '@supabase/supabase-js'

export async function uploadImageToSupabase(
  supabase: SupabaseClient, 
  file: File, 
  bucket: string, 
  folderPath: string
) {
  // 1. Validar Tamaño (Max 5MB)
  const MAX_SIZE = 5 * 1024 * 1024;
  if (file.size > MAX_SIZE) {
    throw new Error("La imagen es demasiado pesada. El límite es 5MB.");
  }

  // 2. Sanitizar nombre (El truco anti-errores)
  const fileExt = file.name.split('.').pop();
  const cleanFileName = `${Date.now()}-${Math.floor(Math.random() * 1000)}.${fileExt}`;
  const fullPath = `${folderPath}/${cleanFileName}`;

  // 3. Subir
  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(fullPath, file);

  if (uploadError) throw uploadError;

  // 4. Obtener URL
  const { data } = supabase.storage
    .from(bucket)
    .getPublicUrl(fullPath);

  return data.publicUrl;
}