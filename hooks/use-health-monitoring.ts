import { useRef, useState, useCallback, useEffect } from 'react'

interface PoseData {
  detected: boolean
  posture: 'sitting' | 'standing' | 'lying' | 'unknown'
  confidence: number
}

interface HealthMetrics {
  poseDetected: boolean
  seizureAlert: boolean
  posture: string
  lastUpdate: Date
  alertHistory: Array<{
    type: 'seizure' | 'posture' | 'general'
    message: string
    timestamp: Date
  }>
}

export function useHealthMonitoring(videoRef: React.RefObject<HTMLVideoElement>) {
  const [metrics, setMetrics] = useState<HealthMetrics>({
    poseDetected: false,
    seizureAlert: false,
    posture: 'unknown',
    lastUpdate: new Date(),
    alertHistory: []
  })
  const [isMonitoring, setIsMonitoring] = useState(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const seizureCheckRef = useRef<NodeJS.Timeout | null>(null)

  const addAlert = useCallback((
    type: 'seizure' | 'posture' | 'general',
    message: string
  ) => {
    setMetrics(prev => ({
      ...prev,
      alertHistory: [
        {
          type,
          message,
          timestamp: new Date()
        },
        ...prev.alertHistory.slice(0, 9) // Keep last 10 alerts
      ]
    }))
  }, [])

  const startMonitoring = useCallback(() => {
    if (isMonitoring) return

    setIsMonitoring(true)
    console.log('[v0] Health monitoring started')

    // Simulate pose detection
    intervalRef.current = setInterval(() => {
      const postures: Array<'sitting' | 'standing' | 'lying' | 'unknown'> = [
        'sitting', 'standing', 'lying', 'unknown'
      ]
      const randomPosture = postures[Math.floor(Math.random() * postures.length)]
      const poseDetected = randomPosture !== 'unknown'

      setMetrics(prev => ({
        ...prev,
        poseDetected,
        posture: randomPosture,
        lastUpdate: new Date()
      }))

      if (poseDetected) {
        console.log('[v0] Pose detected:', randomPosture)
      }
    }, 5000)

    // Simulate seizure detection check
    seizureCheckRef.current = setInterval(() => {
      // Random low probability seizure alert for demonstration
      const seizureDetected = Math.random() < 0.05

      if (seizureDetected) {
        console.log('[v0] ALERT: Potential seizure activity detected')
        setMetrics(prev => ({
          ...prev,
          seizureAlert: true,
          lastUpdate: new Date()
        }))
        addAlert('seizure', 'Unusual movement pattern detected. Please verify user safety.')

        // Auto-clear alert after 30 seconds
        setTimeout(() => {
          setMetrics(prev => ({
            ...prev,
            seizureAlert: false
          }))
        }, 30000)
      }
    }, 10000)
  }, [isMonitoring, addAlert])

  const stopMonitoring = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }

    if (seizureCheckRef.current) {
      clearInterval(seizureCheckRef.current)
      seizureCheckRef.current = null
    }

    setIsMonitoring(false)
    setMetrics({
      poseDetected: false,
      seizureAlert: false,
      posture: 'unknown',
      lastUpdate: new Date(),
      alertHistory: []
    })
    console.log('[v0] Health monitoring stopped')
  }, [])

  const clearAlert = useCallback((index: number) => {
    setMetrics(prev => ({
      ...prev,
      alertHistory: prev.alertHistory.filter((_, i) => i !== index)
    }))
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      if (seizureCheckRef.current) clearInterval(seizureCheckRef.current)
    }
  }, [])

  return {
    metrics,
    isMonitoring,
    startMonitoring,
    stopMonitoring,
    clearAlert
  }
}
