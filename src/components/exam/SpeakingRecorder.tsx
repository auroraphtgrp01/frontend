import { useRef, useState, useEffect, useCallback } from 'react'

type RecordingState = 'idle' | 'preparing' | 'recording' | 'recorded' | 'uploading'

interface SpeakingRecorderProps {
  onRecordingComplete: (blob: Blob, duration: number) => void
  maxDuration?: number // seconds
  maxRetries?: number
  className?: string
}

export function SpeakingRecorder({
  onRecordingComplete,
  maxDuration = 120,
  maxRetries = 3,
  className = '',
}: SpeakingRecorderProps) {
  const [state, setState] = useState<RecordingState>('idle')
  const [recordingTime, setRecordingTime] = useState(0)
  const [prepTime, setPrepTime] = useState(0)
  const [retries, setRetries] = useState(0)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [volume, setVolume] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animationRef = useRef<number | null>(null)

  const cleanup = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    if (animationRef.current) cancelAnimationFrame(animationRef.current)
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl)
      setAudioUrl(null)
    }
  }, [audioUrl])

  useEffect(() => {
    return cleanup
  }, [cleanup])

  const startVisualizer = (stream: MediaStream) => {
    const audioContext = new AudioContext()
    const source = audioContext.createMediaStreamSource(stream)
    const analyser = audioContext.createAnalyser()
    analyser.fftSize = 256
    source.connect(analyser)
    analyserRef.current = analyser

    const draw = () => {
      if (!analyserRef.current) return
      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount)
      analyserRef.current.getByteFrequencyData(dataArray)
      const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length
      setVolume(avg / 255)
      animationRef.current = requestAnimationFrame(draw)
    }
    draw()
  }

  const startRecording = async () => {
    try {
      setError(null)
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      startVisualizer(stream)

      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data)
        }
      }

      mediaRecorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop())
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        setAudioUrl(URL.createObjectURL(blob))
        setState('recorded')
        onRecordingComplete(blob, recordingTime)
      }

      mediaRecorder.start()
      setState('recording')
      setRecordingTime(0)

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => {
          if (prev >= maxDuration) {
            stopRecording()
            return prev
          }
          return prev + 1
        })
      }, 1000)
    } catch (err) {
      setError('Microphone access denied. Please allow microphone access to record.')
      setState('idle')
    }
  }

  const stopRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current)
    if (animationRef.current) cancelAnimationFrame(animationRef.current)
    setVolume(0)

    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop()
    }
  }

  const handleStartPrep = (prepSeconds = 60) => {
    setState('preparing')
    setPrepTime(prepSeconds)
    timerRef.current = setInterval(() => {
      setPrepTime((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!)
          startRecording()
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  const handleReRecord = () => {
    cleanup()
    if (retries < maxRetries) {
      setRetries((r) => r + 1)
      setState('idle')
    } else {
      setError('Maximum re-record attempts reached.')
    }
  }

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  return (
    <div className={`flex flex-col gap-4 ${className}`}>
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          {error}
        </div>
      )}

      {state === 'idle' && (
        <div className="flex flex-col items-center gap-4 py-8">
          <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-10 h-10 text-red-500">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="23" />
              <line x1="8" y1="23" x2="16" y2="23" />
            </svg>
          </div>
          <button
            onClick={() => handleStartPrep(60)}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
          >
            Start Recording
          </button>
          <p className="text-sm text-gray-500">
            Make sure your microphone is connected
          </p>
        </div>
      )}

      {state === 'preparing' && (
        <div className="flex flex-col items-center gap-4 py-8">
          <div className="text-6xl font-bold text-blue-600 font-mono">
            {formatTime(prepTime)}
          </div>
          <p className="text-gray-500">Prepare your answer...</p>
          <p className="text-sm text-gray-400">Recording will start automatically</p>
        </div>
      )}

      {state === 'recording' && (
        <div className="flex flex-col items-center gap-4 py-8">
          {/* Visual indicator */}
          <div className="relative w-20 h-20 flex items-center justify-center">
            <div
              className="absolute inset-0 rounded-full bg-red-100 transition-all duration-100"
              style={{
                transform: `scale(${1 + volume * 0.5})`,
                opacity: 0.3 + volume * 0.7,
              }}
            />
            <div className="w-8 h-8 rounded-full bg-red-500 animate-pulse" />
          </div>

          <div className="text-4xl font-bold font-mono text-red-600">
            {formatTime(recordingTime)}
          </div>

          <p className="text-sm text-gray-500">
            Recording... {maxDuration - recordingTime}s remaining
          </p>

          <button
            onClick={stopRecording}
            className="px-6 py-3 bg-gray-800 hover:bg-gray-900 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
          >
            <div className="w-3 h-3 rounded bg-red-500" />
            Stop Recording
          </button>
        </div>
      )}

      {state === 'recorded' && (
        <div className="flex flex-col gap-4 py-4">
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <audio src={audioUrl || ''} controls className="flex-1 h-8" />
          </div>

          <div className="flex gap-3">
            {retries < maxRetries && (
              <button
                onClick={handleReRecord}
                className="flex-1 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition-colors"
              >
                Re-record ({maxRetries - retries} left)
              </button>
            )}
            <button
              onClick={() => setState('idle')}
              className="flex-1 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            >
              Use this recording
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
