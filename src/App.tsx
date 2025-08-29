import ImageUpload from '@/components/file-upload/image-upload'

function App() {
  const handleUpload = (images: any[]) => {
    // Esta função é chamada quando o upload está completo
    console.log('Upload completed:', images)

    // Aqui pode processar as imagens carregadas
    images.forEach(image => {
      console.log('Image uploaded:', image.file.name)
    })
  }

  return (
    <div style={{ minHeight: '100vh', padding: '2rem', backgroundColor: '#ffffff' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 'bold', textAlign: 'center', marginBottom: '2rem' }}>
          Image Upload Demo
        </h1>

        <ImageUpload
          onUploadComplete={handleUpload}
          maxFiles={5}
          maxSize={5 * 1024 * 1024} // 5MB
          accept="image/*"
        />
      </div>
    </div>
  )
}

export default App
