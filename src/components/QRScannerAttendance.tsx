/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import jsQR from 'jsqr';
import { 
  Camera, 
  CameraOff, 
  Upload, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Volume2, 
  VolumeX, 
  RefreshCw, 
  Clock, 
  Sparkles, 
  User, 
  X,
  Play,
  Square,
  ShieldCheck,
  ChevronDown
} from 'lucide-react';
import { Student, Class, Subject, AttendanceRecord, AttendanceStatus } from '../types';
import { playScanSound } from '../utils';

interface QRScannerAttendanceProps {
  students: Student[];
  classes: Class[];
  subjects: Subject[];
  attendance: AttendanceRecord[];
  selectedDate: string;
  selectedClassId: string;
  selectedSubjectId: string;
  onMarkAttendance: (record: AttendanceRecord) => Promise<void>;
  onClose?: () => void;
}

interface ScanResultNotification {
  type: 'success' | 'duplicate' | 'error';
  title: string;
  message: string;
  student?: Student;
  timestamp: string;
  existingStatus?: AttendanceStatus;
}

export default function QRScannerAttendance({
  students,
  classes,
  subjects,
  attendance,
  selectedDate,
  selectedClassId,
  selectedSubjectId,
  onMarkAttendance,
  onClose,
}: QRScannerAttendanceProps) {
  // Scanner configuration states
  const [scanStatusMode, setScanStatusMode] = useState<AttendanceStatus>('present');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  
  // Last scan banner notification
  const [lastNotification, setLastNotification] = useState<ScanResultNotification | null>(null);
  
  // Live Session scanned records (in reverse chronological order)
  const [sessionScans, setSessionScans] = useState<{
    student: Student;
    status: AttendanceStatus;
    time: string;
    markedVia: 'qr_scan';
  }[]>([]);

  // Video and Canvas references
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameId = useRef<number | null>(null);
  const isProcessingRef = useRef(false);
  const lastScannedTokenRef = useRef<string | null>(null);
  const lastScanTimeRef = useRef<number>(0);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Load available camera devices
  useEffect(() => {
    async function getDevices() {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) return;
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(d => d.kind === 'videoinput');
        setAvailableCameras(videoDevices);
        if (videoDevices.length > 0 && !selectedCameraId) {
          setSelectedCameraId(videoDevices[0].deviceId);
        }
      } catch (e) {
        console.warn('Could not enumerate video devices:', e);
      }
    }
    getDevices();
  }, []);

  // Stop camera helper
  const stopCamera = useCallback(() => {
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
      animationFrameId.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  }, []);

  // Start camera helper
  const startCamera = useCallback(async () => {
    stopCamera();
    setCameraError(null);

    try {
      const constraints: MediaStreamConstraints = {
        video: selectedCameraId 
          ? { deviceId: { exact: selectedCameraId }, width: { ideal: 640 }, height: { ideal: 480 } }
          : { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } },
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
        setIsCameraActive(true);
      }
    } catch (err: any) {
      console.error('Camera access error:', err);
      let errMsg = 'Failed to access camera.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errMsg = 'Camera permission denied. Please allow camera access in browser settings.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        errMsg = 'No video capture hardware found on this device.';
      }
      setCameraError(errMsg);
      setIsCameraActive(false);
    }
  }, [selectedCameraId, stopCamera]);

  // Clean up stream on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  // Central QR Code Processor
  const processQRCodeToken = useCallback(async (tokenText: string) => {
    const trimmed = tokenText.trim();
    if (!trimmed) return;

    // Cooldown check (prevent repeated firing for the exact same token within 2.5 seconds)
    const now = Date.now();
    if (lastScannedTokenRef.current === trimmed && now - lastScanTimeRef.current < 2500) {
      return;
    }
    lastScannedTokenRef.current = trimmed;
    lastScanTimeRef.current = now;

    // 1. Look up student by unique opaque qrToken
    const student = students.find(s => s.qrToken === trimmed);

    if (!student) {
      if (soundEnabled) playScanSound('error');
      setLastNotification({
        type: 'error',
        title: 'Unrecognized QR Pass',
        message: 'The scanned code does not match any registered student in this institution.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      });
      return;
    }

    // 2. Determine class and subject context
    const targetClassId = selectedClassId || student.classId;
    const targetSubjectId = selectedSubjectId || (subjects[0]?.id || 's1');
    const targetDate = selectedDate || new Date().toISOString().split('T')[0];

    // 3. Duplicate Attendance Check for Date + Class + Subject
    const existingRecord = attendance.find(
      r => r.studentId === student.id && r.date === targetDate && r.subjectId === targetSubjectId && r.classId === targetClassId
    );

    const alreadyInSession = sessionScans.find(s => s.student.id === student.id);

    if (existingRecord || alreadyInSession) {
      const recordedStatus = existingRecord?.status || alreadyInSession?.status || 'present';
      if (soundEnabled) playScanSound('duplicate');

      setLastNotification({
        type: 'duplicate',
        title: 'Duplicate Scan Detected',
        message: `${student.name} is already registered as ${recordedStatus.toUpperCase()} today.`,
        student,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        existingStatus: recordedStatus,
      });
      return;
    }

    // 4. Record New Attendance
    const newRecord: AttendanceRecord = {
      id: `${targetClassId}_${targetSubjectId}_${targetDate}_${student.id}`,
      studentId: student.id,
      classId: targetClassId,
      subjectId: targetSubjectId,
      date: targetDate,
      status: scanStatusMode,
      notes: `Scanned at ${new Date().toLocaleTimeString()}`,
      markedVia: 'qr_scan',
      updatedAt: Date.now(),
    };

    try {
      await onMarkAttendance(newRecord);
      if (soundEnabled) playScanSound('success');

      const timeString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

      setLastNotification({
        type: 'success',
        title: 'Attendance Recorded!',
        message: `Marked as ${scanStatusMode.toUpperCase()} via Digital ID pass.`,
        student,
        timestamp: timeString,
      });

      setSessionScans(prev => [
        {
          student,
          status: scanStatusMode,
          time: timeString,
          markedVia: 'qr_scan',
        },
        ...prev,
      ]);
    } catch (e) {
      console.error('Failed to mark QR attendance:', e);
      if (soundEnabled) playScanSound('error');
      setLastNotification({
        type: 'error',
        title: 'Storage Error',
        message: 'Could not write attendance log to IndexedDB.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      });
    }
  }, [students, attendance, sessionScans, selectedClassId, selectedSubjectId, selectedDate, scanStatusMode, soundEnabled, onMarkAttendance, subjects]);

  // Video Frame Scanning Loop
  const scanVideoFrame = useCallback(() => {
    if (!isCameraActive || !videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    if (video.readyState === video.HAVE_ENOUGH_DATA && ctx) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'dontInvert',
      });

      if (code && code.data && !isProcessingRef.current) {
        isProcessingRef.current = true;
        processQRCodeToken(code.data);
        setTimeout(() => {
          isProcessingRef.current = false;
        }, 1200);
      }
    }

    animationFrameId.current = requestAnimationFrame(scanVideoFrame);
  }, [isCameraActive, processQRCodeToken]);

  // Trigger scan loop when camera starts
  useEffect(() => {
    if (isCameraActive) {
      animationFrameId.current = requestAnimationFrame(scanVideoFrame);
    }
    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [isCameraActive, scanVideoFrame]);

  // Handle uploaded card photo
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return;
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);

        if (code && code.data) {
          processQRCodeToken(code.data);
        } else {
          if (soundEnabled) playScanSound('error');
          setLastNotification({
            type: 'error',
            title: 'No QR Code Detected',
            message: 'Unable to decode a valid QR code in the uploaded card image. Please ensure the code is clear.',
            timestamp: new Date().toLocaleTimeString(),
          });
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Find class and subject display labels
  const currentClass = classes.find(c => c.id === selectedClassId);
  const currentSubject = subjects.find(s => s.id === selectedSubjectId);

  // Filter students for simulated quick-scan test selector
  const eligibleStudents = selectedClassId 
    ? students.filter(s => s.classId === selectedClassId)
    : students;

  return (
    <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200/50 dark:border-slate-800/50 rounded-xl p-4 shadow-sm space-y-4">
      {/* Top Header & Settings Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/40 dark:border-slate-800/40">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-500">
              <Camera size={16} />
            </span>
            <h3 className="font-sans font-bold text-slate-800 dark:text-slate-100 text-sm">
              Live QR Card Attendance Scanner
            </h3>
            <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              OFFLINE READY
            </span>
          </div>
          <p className="font-sans text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            Hold student ID card QR code in front of camera to mark attendance instantly with audio verification.
          </p>
        </div>

        {/* Configuration Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Default scan status toggle */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-950 p-0.5 rounded-lg border border-slate-200/60 dark:border-slate-800/60">
            <button
              type="button"
              onClick={() => setScanStatusMode('present')}
              className={`px-2 py-1 rounded text-[10px] font-bold font-sans transition-all ${
                scanStatusMode === 'present'
                  ? 'bg-emerald-500 text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              Mark Present
            </button>
            <button
              type="button"
              onClick={() => setScanStatusMode('late')}
              className={`px-2 py-1 rounded text-[10px] font-bold font-sans transition-all ${
                scanStatusMode === 'late'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              Mark Late
            </button>
          </div>

          {/* Sound Mute/Unmute */}
          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-1.5 rounded-lg border text-xs transition-colors ${
              soundEnabled
                ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400'
                : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400'
            }`}
            title={soundEnabled ? 'Chime sound is active' : 'Audio sound is muted'}
          >
            {soundEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
          </button>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              title="Close Scanner"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Main Grid: Camera Viewport on left, Feedback & Session Log on right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column: Live Camera Video Stream */}
        <div className="lg:col-span-7 flex flex-col space-y-3">
          <div className="relative aspect-4/3 w-full bg-slate-950 rounded-xl overflow-hidden border border-slate-700/60 shadow-inner flex items-center justify-center">
            {/* Hidden canvas for jsQR analysis */}
            <canvas ref={canvasRef} className="hidden" />

            {/* Video element */}
            <video
              ref={videoRef}
              className={`w-full h-full object-cover ${isCameraActive ? 'block' : 'hidden'}`}
              playsInline
              muted
            />

            {/* Scanning Target Guide Overlay */}
            {isCameraActive && (
              <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-6">
                <div className="relative w-56 h-56 border-2 border-indigo-400/80 rounded-2xl bg-indigo-500/5 shadow-[0_0_20px_rgba(99,102,241,0.25)] flex items-center justify-center">
                  {/* Corner accents */}
                  <div className="absolute -top-1.5 -left-1.5 w-6 h-6 border-t-4 border-l-4 border-indigo-400 rounded-tl-lg" />
                  <div className="absolute -top-1.5 -right-1.5 w-6 h-6 border-t-4 border-r-4 border-indigo-400 rounded-tr-lg" />
                  <div className="absolute -bottom-1.5 -left-1.5 w-6 h-6 border-b-4 border-l-4 border-indigo-400 rounded-bl-lg" />
                  <div className="absolute -bottom-1.5 -right-1.5 w-6 h-6 border-b-4 border-r-4 border-indigo-400 rounded-br-lg" />

                  {/* Pulsing scanning beam line */}
                  <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-indigo-400 to-transparent animate-pulse absolute top-1/2 -translate-y-1/2 shadow-[0_0_8px_#818cf8]" />
                </div>
                <span className="mt-3 px-3 py-1 rounded-full bg-slate-900/85 backdrop-blur-md text-[10px] font-mono text-indigo-200 border border-indigo-500/30 font-semibold shadow-sm">
                  Align Student Card QR in Box
                </span>
              </div>
            )}

            {/* Camera Inactive / Permission Prompt */}
            {!isCameraActive && (
              <div className="text-center p-6 space-y-3 z-10 max-w-sm">
                <div className="w-12 h-12 rounded-full bg-slate-800 border border-slate-700 mx-auto flex items-center justify-center text-slate-400">
                  <CameraOff size={22} />
                </div>
                <div>
                  <h4 className="font-bold text-slate-200 text-xs">Camera Feed Inactive</h4>
                  <p className="text-[11px] text-slate-400 mt-1">
                    {cameraError || 'Activate your device camera or upload a captured card image to scan.'}
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row justify-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={startCamera}
                    className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow transition-all"
                  >
                    <Play size={13} fill="currentColor" />
                    <span>Start Webcam</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold border border-slate-700 transition-all"
                  >
                    <Upload size={13} />
                    <span>Upload Card Photo</span>
                  </button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Camera Controls Footer Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              {isCameraActive ? (
                <button
                  type="button"
                  onClick={stopCamera}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 border border-rose-500/20 text-[11px] font-semibold transition-colors"
                >
                  <Square size={11} fill="currentColor" />
                  <span>Stop Camera</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={startCamera}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/20 border border-indigo-500/20 text-[11px] font-semibold transition-colors"
                >
                  <Play size={11} fill="currentColor" />
                  <span>Start Camera</span>
                </button>
              )}

              {/* Upload image snapshot alternative */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-[11px] font-semibold transition-colors"
              >
                <Upload size={11} />
                <span>Upload Card Image</span>
              </button>
            </div>

            {/* Camera switch if multiple */}
            {availableCameras.length > 1 && (
              <div className="relative">
                <select
                  value={selectedCameraId}
                  onChange={(e) => {
                    setSelectedCameraId(e.target.value);
                    if (isCameraActive) setTimeout(startCamera, 100);
                  }}
                  className="appearance-none pl-2 pr-6 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-[10px] font-mono text-slate-700 dark:text-slate-300"
                >
                  {availableCameras.map((cam, idx) => (
                    <option key={cam.deviceId || idx} value={cam.deviceId}>
                      {cam.label || `Camera ${idx + 1}`}
                    </option>
                  ))}
                </select>
                <ChevronDown size={11} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            )}
          </div>

          {/* Quick Interactive Testing Simulator */}
          <div className="p-3 bg-slate-50/70 dark:bg-slate-950/40 rounded-xl border border-slate-200/50 dark:border-slate-800/50 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <Sparkles size={11} className="text-amber-500" />
                Quick Test Simulator (Click to test scanning)
              </span>
              <span className="text-[9px] text-slate-400">Useful for testing without physical printout</span>
            </div>

            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
              {eligibleStudents.slice(0, 8).map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => processQRCodeToken(st.qrToken)}
                  className="px-2 py-1 rounded bg-white dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 text-[10px] font-semibold transition-all flex items-center gap-1"
                >
                  <span>{st.name}</span>
                  <span className="font-mono text-[9px] text-slate-400">#{st.rollNumber}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Live Status Notification & Session Scanned Feed */}
        <div className="lg:col-span-5 flex flex-col space-y-3.5">
          {/* Active Context Card */}
          <div className="p-3 rounded-xl bg-slate-50/70 dark:bg-slate-950/50 border border-slate-200/50 dark:border-slate-800/50 flex items-center justify-between text-xs">
            <div>
              <span className="block text-[9px] font-mono uppercase tracking-wider text-slate-400">Target Session</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">
                {currentClass ? `${currentClass.name} - ${currentClass.section}` : 'Any Class'} • {currentSubject?.name || 'Class Roster'}
              </span>
            </div>
            <div className="text-right">
              <span className="block text-[9px] font-mono uppercase tracking-wider text-slate-400">Date</span>
              <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{selectedDate}</span>
            </div>
          </div>

          {/* Instant Scan Banner Result */}
          {lastNotification ? (
            <div
              className={`p-3.5 rounded-xl border flex gap-3 items-start transition-all animate-in fade-in zoom-in-95 duration-200 ${
                lastNotification.type === 'success'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300'
                  : lastNotification.type === 'duplicate'
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-300'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-800 dark:text-rose-300'
              }`}
            >
              <div className="mt-0.5">
                {lastNotification.type === 'success' ? (
                  <CheckCircle2 size={18} className="text-emerald-500" />
                ) : lastNotification.type === 'duplicate' ? (
                  <AlertTriangle size={18} className="text-amber-500" />
                ) : (
                  <XCircle size={18} className="text-rose-500" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-xs leading-tight">{lastNotification.title}</h4>
                  <span className="font-mono text-[9px] opacity-75">{lastNotification.timestamp}</span>
                </div>
                <p className="text-[11px] mt-0.5 leading-snug">{lastNotification.message}</p>

                {lastNotification.student && (
                  <div className="mt-2 pt-2 border-t border-current/15 flex items-center gap-2">
                    <div className="w-7 h-7 rounded bg-current/20 flex items-center justify-center font-bold text-xs">
                      {lastNotification.student.name.charAt(0)}
                    </div>
                    <div className="text-[11px] truncate">
                      <span className="font-bold block truncate">{lastNotification.student.name}</span>
                      <span className="font-mono text-[9px] opacity-80">
                        Roll #{lastNotification.student.rollNumber} • ID: {lastNotification.student.studentId}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-5 rounded-xl border border-dashed border-slate-300 dark:border-slate-800 text-center">
              <ShieldCheck size={26} className="mx-auto text-slate-300 dark:text-slate-600 mb-1" />
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Ready for scan input</p>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                Duplicate scans are automatically detected and blocked.
              </p>
            </div>
          )}

          {/* Live Session Feed Log */}
          <div className="flex-1 flex flex-col min-h-[180px]">
            <div className="flex items-center justify-between pb-1.5">
              <span className="text-[10px] font-mono uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Clock size={11} /> Scanned In Current Session ({sessionScans.length})
              </span>
              {sessionScans.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSessionScans([])}
                  className="text-[9px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  Clear Feed
                </button>
              )}
            </div>

            <div className="flex-1 bg-white/50 dark:bg-slate-950/40 rounded-xl border border-slate-200/50 dark:border-slate-800/50 overflow-hidden">
              {sessionScans.length === 0 ? (
                <div className="h-full py-8 flex flex-col items-center justify-center text-center px-4">
                  <p className="text-slate-400 dark:text-slate-500 text-xs">No cards scanned in this session yet.</p>
                  <p className="text-slate-400 text-[10px] mt-0.5">Scanned records will appear here in real-time.</p>
                </div>
              ) : (
                <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60 p-1">
                  {sessionScans.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-2 flex items-center justify-between hover:bg-slate-50/50 dark:hover:bg-slate-900/30 rounded-lg text-xs"
                    >
                      <div className="flex items-center gap-2 truncate pr-2">
                        <div className="w-6 h-6 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-[10px] flex items-center justify-center">
                          {item.student.name.charAt(0)}
                        </div>
                        <div className="truncate">
                          <p className="font-semibold text-slate-800 dark:text-slate-200 text-xs truncate">
                            {item.student.name}
                          </p>
                          <p className="text-[9px] font-mono text-slate-400">
                            #{item.student.rollNumber} • {item.student.studentId}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-mono text-[9px] text-slate-400">{item.time}</span>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase font-mono ${
                            item.status === 'present'
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                              : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                          }`}
                        >
                          {item.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
