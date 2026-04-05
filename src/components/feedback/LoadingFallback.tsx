// src/components/feedback/LoadingFallback.tsx

export default function LoadingFallback() {
  return (
    <div 
      className="min-h-screen flex flex-col items-center justify-center font-mono pointer-events-none"
      // Menggunakan backgroundColor #050A0F langsung agar tidak bergantung pada config jika CSS lambat dimuat
      style={{ backgroundColor: '#050A0F', color: '#00D4FF' }}
    >
      <div className="relative flex items-center justify-center w-24 h-24">
        {/* Outer rotating ring (Cincin berputar) */}
        <div 
          className="absolute inset-0 border-t-2 border-r-2 rounded-full animate-spin"
          style={{ borderColor: 'rgba(0, 212, 255, 0.8)' }}
        />
        
        {/* Inner static/pulsing sigma (Lambang Sigma) */}
        <div 
          className="text-4xl font-bold animate-pulse"
          style={{ textShadow: '0 0 15px rgba(0, 212, 255, 0.6)' }}
        >
          σ
        </div>
      </div>
      
      {/* Teks Loading */}
      <div className="mt-8 flex flex-col items-center">
        <p className="text-sm tracking-[0.3em] font-semibold animate-pulse uppercase">
          Initializing
        </p>
        <p 
          className="mt-2 text-[10px] tracking-widest opacity-60"
          style={{ color: '#00FF9C' }}
        >
          SIGMA WAR ROOM KERNEL
        </p>
      </div>
    </div>
  )
}
