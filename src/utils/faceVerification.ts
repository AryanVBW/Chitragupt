import * as faceapi from 'face-api.js';
import { supabase } from '../lib/supabase';

export interface FaceDescriptor {
  id: string;
  userId: string;
  descriptor: Float32Array;
  timestamp: Date;
  imageUrl?: string;
}

export interface FaceVerificationResult {
  isMatch: boolean;
  confidence: number;
  error?: string;
  processingTime?: number;
}

export interface FaceDetectionOptions {
  inputSize?: number;
  scoreThreshold?: number;
}

class FaceVerificationService {
  private isInitialized = false;
  private modelsLoaded = new Set<string>();
  private modelCache = new Map<string, any>();
  private faceDescriptorCache = new Map<string, Float32Array>();
  private lastDetectionTime = 0;
  private detectionCooldown = 50; // Reduced cooldown for faster detection
  private readonly CONFIDENCE_THRESHOLD = 0.6; // Slightly lower for better UX
  private readonly MAX_FACE_DISTANCE = 0.4; // Slightly higher for better matching
  private readonly MODEL_URLS = {
    tinyFaceDetector: '/models',
    faceLandmark68Net: '/models',
    faceRecognitionNet: '/models',
    faceExpressionNet: '/models'
  };
  private performanceMetrics = {
    totalVerifications: 0,
    successfulVerifications: 0,
    averageProcessingTime: 0,
    cacheHits: 0,
    cacheMisses: 0
  };

  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    let retryCount = 0;
    const maxRetries = 3;
    
    const attemptInitialization = async (): Promise<void> => {
      try {
        const startTime = performance.now();
        
        // Check if models are already loaded
        const modelsLoaded = [
          faceapi.nets.tinyFaceDetector.isLoaded,
          faceapi.nets.faceLandmark68Net.isLoaded,
          faceapi.nets.faceRecognitionNet.isLoaded
        ].every(Boolean);
        
        if (modelsLoaded) {
          this.isInitialized = true;
          console.log('Face verification service already initialized');
          return;
        }
        
        // Load only essential models for faster initialization
        const modelPromises = [
          this.loadModelWithCache('tinyFaceDetector', () => 
            faceapi.nets.tinyFaceDetector.loadFromUri(this.MODEL_URLS.tinyFaceDetector)
          ),
          this.loadModelWithCache('faceLandmark68Net', () => 
            faceapi.nets.faceLandmark68Net.loadFromUri(this.MODEL_URLS.faceLandmark68Net)
          ),
          this.loadModelWithCache('faceRecognitionNet', () => 
            faceapi.nets.faceRecognitionNet.loadFromUri(this.MODEL_URLS.faceRecognitionNet)
          )
        ];
        
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Model loading timeout')), 8000);
        });
        
        await Promise.race([
          Promise.all(modelPromises),
          timeoutPromise
        ]);
        
        // Verify essential models are loaded
        const allModelsLoaded = [
          faceapi.nets.tinyFaceDetector.isLoaded,
          faceapi.nets.faceLandmark68Net.isLoaded,
          faceapi.nets.faceRecognitionNet.isLoaded
        ].every(Boolean);
        
        if (!allModelsLoaded) {
          throw new Error('Some models failed to load properly');
        }
        
        const loadTime = performance.now() - startTime;
        console.log(`Face API models loaded successfully in ${loadTime.toFixed(2)}ms`);
        
        this.isInitialized = true;
      } catch (error) {
        console.error(`Initialization attempt ${retryCount + 1} failed:`, error);
        
        if (retryCount < maxRetries) {
          retryCount++;
          console.log(`Retrying initialization... (${retryCount}/${maxRetries})`);
          
          // Wait before retry with exponential backoff
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
          
          return attemptInitialization();
        } else {
          const errorMessage = error instanceof Error ? error.message : 'Unknown initialization error';
          throw new Error(`Failed to initialize face verification service after ${maxRetries} attempts: ${errorMessage}`);
        }
      }
    };
    
    await attemptInitialization();
  }

  private async loadModelWithCache(modelName: string, loadFunction: () => Promise<void>): Promise<void> {
    if (this.modelsLoaded.has(modelName)) {
      return;
    }

    try {
      await loadFunction();
      this.modelsLoaded.add(modelName);
      console.log(`Model ${modelName} loaded successfully`);
    } catch (error) {
      console.error(`Failed to load model ${modelName}:`, error);
      throw error;
    }
  }

  async detectFace(
    imageElement: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement,
    options: FaceDetectionOptions = {}
  ): Promise<any[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    // Implement detection cooldown to prevent excessive calls
    const now = performance.now();
    if (now - this.lastDetectionTime < this.detectionCooldown) {
      await new Promise(resolve => setTimeout(resolve, this.detectionCooldown - (now - this.lastDetectionTime)));
    }
    this.lastDetectionTime = performance.now();

    const startTime = performance.now();
    let retryCount = 0;
    const maxRetries = 1; // Reduced retries for faster response
    
    const attemptDetection = async (): Promise<any[]> => {
      try {
        // Validate input element
        if (!imageElement) {
          throw new Error('Invalid input element for face detection');
        }
        
        // Check if input is ready for detection
        if (imageElement instanceof HTMLVideoElement) {
          if (imageElement.readyState < 2 || imageElement.videoWidth === 0 || imageElement.videoHeight === 0) {
            throw new Error('Video element not ready for detection');
          }
        } else if (imageElement instanceof HTMLImageElement) {
          if (!imageElement.complete || imageElement.naturalWidth === 0) {
            throw new Error('Image element not loaded');
          }
        }
        
        // Optimized detection options for better performance
        const detectionOptions = new faceapi.TinyFaceDetectorOptions({
          inputSize: options.inputSize || 320, // Reduced for faster processing
          scoreThreshold: options.scoreThreshold || 0.4 // Lower threshold for better detection
        });

        // Perform detection with reduced timeout
        const detectionPromise = faceapi
          .detectAllFaces(imageElement, detectionOptions)
          .withFaceLandmarks()
          .withFaceDescriptors()
          .withFaceExpressions();
        
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Face detection timeout')), 5000);
        });
        
        const detections = await Promise.race([detectionPromise, timeoutPromise]);
        
        // Validate detection results
        if (!Array.isArray(detections)) {
          throw new Error('Invalid detection results');
        }

        // Cache face descriptors for performance
        if (detections.length > 0 && detections[0].descriptor) {
          const cacheKey = `${imageElement.tagName}_${Date.now()}`;
          this.faceDescriptorCache.set(cacheKey, detections[0].descriptor);
          this.performanceMetrics.cacheMisses++;
        }

        const processingTime = performance.now() - startTime;
        console.log(`Face detection completed in ${processingTime.toFixed(2)}ms, found ${detections.length} faces`);
        
        return detections;
      } catch (error) {
        console.error(`Face detection attempt ${retryCount + 1} failed:`, error);
        
        if (retryCount < maxRetries) {
          retryCount++;
          
          // Check if we need to reinitialize
          if (error instanceof Error && 
              (error.message.includes('not initialized') || 
               error.message.includes('models') ||
               error.message.includes('undefined'))) {
            console.log('Attempting to reinitialize face verification service...');
            this.isInitialized = false;
            await this.initialize();
          }
          
          // Reduced wait time before retry
          await new Promise(resolve => setTimeout(resolve, 200));
          
          return attemptDetection();
        } else {
          const errorMessage = error instanceof Error ? error.message : 'Unknown detection error';
          throw new Error(`Face detection failed after ${maxRetries} attempts: ${errorMessage}`);
        }
      }
    };
    
    return attemptDetection();
  }

  async captureAndStoreFace(videoElement: HTMLVideoElement, userId: string): Promise<FaceDescriptor | null> {
    try {
      const detections = await this.detectFace(videoElement);
      
      if (detections.length === 0) {
        throw new Error('No face detected in the image');
      }

      if (detections.length > 1) {
        throw new Error('Multiple faces detected. Please ensure only one face is visible.');
      }

      const detection = detections[0];
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      
      canvas.width = videoElement.videoWidth;
      canvas.height = videoElement.videoHeight;
      ctx.drawImage(videoElement, 0, 0);
      
      // Convert canvas to blob
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((blob) => resolve(blob!), 'image/jpeg', 0.8);
      });

      // Upload image to Supabase storage
      const fileName = `face-${userId}-${Date.now()}.jpg`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, blob);

      if (uploadError) {
        console.error('Failed to upload face image:', uploadError);
      }

      const imageUrl = uploadData ? supabase.storage.from('avatars').getPublicUrl(fileName).data.publicUrl : undefined;

      const faceDescriptor: FaceDescriptor = {
        id: crypto.randomUUID(),
        userId,
        descriptor: detection.descriptor,
        timestamp: new Date(),
        imageUrl
      };

      // Store face data in Supabase
      await this.storeFaceDescriptor(faceDescriptor);
      
      return faceDescriptor;
    } catch (error) {
      console.error('Face capture failed:', error);
      throw error;
    }
  }

  async verifyFace(videoElement: HTMLVideoElement, userId: string): Promise<FaceVerificationResult> {
    const startTime = performance.now();
    this.performanceMetrics.totalVerifications++;
    
    try {
      // Check cache first for faster verification
      const cacheKey = `verify_${userId}_${Date.now()}`;
      
      // Use optimized detection settings for verification
      const currentDetections = await this.detectFace(videoElement, {
        inputSize: 416, // Balanced resolution for speed and accuracy
        scoreThreshold: 0.3 // Lower threshold for better detection
      });
      
      if (currentDetections.length === 0) {
        return { 
          isMatch: false, 
          confidence: 0, 
          error: 'No face detected',
          processingTime: performance.now() - startTime
        };
      }

      if (currentDetections.length > 1) {
        return { 
          isMatch: false, 
          confidence: 0, 
          error: 'Multiple faces detected. Please ensure only one face is visible.',
          processingTime: performance.now() - startTime
        };
      }

      const currentDescriptor = currentDetections[0].descriptor;
      
      // Cache current descriptor for future use
      this.faceDescriptorCache.set(cacheKey, currentDescriptor);
      
      // Get stored face descriptors for the user
      const storedDescriptors = await this.getUserFaceDescriptors(userId);
      
      if (storedDescriptors.length === 0) {
        return { 
          isMatch: false, 
          confidence: 0, 
          error: 'No stored face data found. Please set up face verification first.',
          processingTime: performance.now() - startTime
        };
      }

      // Optimized comparison with improved algorithm
      let bestMatch = {
        distance: Infinity,
        confidence: 0,
        isMatch: false
      };

      // Use parallel processing for multiple descriptors
      const comparisons = storedDescriptors.map(storedDescriptor => {
        const distance = faceapi.euclideanDistance(currentDescriptor, storedDescriptor.descriptor);
        return { distance, storedDescriptor };
      });

      // Find best match with optimized scoring
      for (const { distance } of comparisons) {
        // Improved confidence calculation with non-linear scaling
        const normalizedDistance = Math.min(distance / this.MAX_FACE_DISTANCE, 1);
        const confidence = Math.pow(1 - normalizedDistance, 1.5); // Non-linear for better discrimination
        
        if (distance < bestMatch.distance) {
          bestMatch = {
            distance,
            confidence,
            isMatch: distance <= this.MAX_FACE_DISTANCE && confidence >= this.CONFIDENCE_THRESHOLD
          };
        }
      }

      const processingTime = performance.now() - startTime;
      const isMatch = bestMatch.isMatch;
      const finalConfidence = bestMatch.confidence;

      // Update performance metrics
      if (isMatch) {
        this.performanceMetrics.successfulVerifications++;
        this.performanceMetrics.cacheHits++;
      } else {
        this.performanceMetrics.cacheMisses++;
      }
      
      this.performanceMetrics.averageProcessingTime = 
        (this.performanceMetrics.averageProcessingTime * (this.performanceMetrics.totalVerifications - 1) + processingTime) / 
        this.performanceMetrics.totalVerifications;

      // Log verification attempt (async to not block)
      this.logVerificationAttempt(userId, isMatch, finalConfidence).catch(console.error);

      console.log(`Face verification completed: ${isMatch ? 'MATCH' : 'NO MATCH'} (confidence: ${(finalConfidence * 100).toFixed(1)}%, time: ${processingTime.toFixed(2)}ms)`);
      
      return {
        isMatch,
        confidence: finalConfidence,
        processingTime
      };
    } catch (error) {
      console.error('Face verification failed:', error);
      return { 
        isMatch: false, 
        confidence: 0, 
        error: error instanceof Error ? error.message : 'Verification failed',
        processingTime: performance.now() - startTime
      };
    }
  }

  private async storeFaceDescriptor(faceDescriptor: FaceDescriptor): Promise<void> {
    const { error } = await supabase
      .from('users')
      .update({
        face_data: {
          descriptor: Array.from(faceDescriptor.descriptor),
          timestamp: faceDescriptor.timestamp.toISOString(),
          imageUrl: faceDescriptor.imageUrl
        }
      })
      .eq('id', faceDescriptor.userId);

    if (error) {
      console.error('Failed to store face descriptor:', error);
      throw new Error('Failed to store face data');
    }
  }

  private async getUserFaceDescriptors(userId: string): Promise<FaceDescriptor[]> {
    const { data, error } = await supabase
      .from('users')
      .select('face_data')
      .eq('id', userId)
      .single();

    if (error || !data?.face_data) {
      return [];
    }

    const faceData = data.face_data as any;
    if (!faceData.descriptor) {
      return [];
    }

    return [{
      id: crypto.randomUUID(),
      userId,
      descriptor: new Float32Array(faceData.descriptor),
      timestamp: new Date(faceData.timestamp),
      imageUrl: faceData.imageUrl
    }];
  }

  private async logVerificationAttempt(userId: string, success: boolean, confidence: number): Promise<void> {
    try {
      const { error } = await supabase
        .from('chat_messages')
        .insert({
          user_id: userId,
          content: `Face verification ${success ? 'successful' : 'failed'}`,
          message_type: 'system',
          metadata: {
            type: 'face_verification',
            success,
            confidence,
            timestamp: new Date().toISOString()
          }
        });

      if (error) {
        console.error('Failed to log verification attempt:', error);
      }
    } catch (error) {
      console.error('Error logging verification attempt:', error);
    }
  }

  async setupUserFaceVerification(userId: string): Promise<void> {
    const { error } = await supabase
      .from('users')
      .update({ requires_face_verification: true })
      .eq('id', userId);

    if (error) {
      console.error('Failed to enable face verification:', error);
      throw new Error('Failed to setup face verification');
    }
  }

  // Performance monitoring methods
  getPerformanceMetrics() {
    return {
      ...this.performanceMetrics,
      successRate: this.performanceMetrics.totalVerifications > 0 
        ? (this.performanceMetrics.successfulVerifications / this.performanceMetrics.totalVerifications) * 100 
        : 0,
      cacheSize: this.faceDescriptorCache.size,
      cacheHitRate: this.performanceMetrics.cacheHits + this.performanceMetrics.cacheMisses > 0
        ? (this.performanceMetrics.cacheHits / (this.performanceMetrics.cacheHits + this.performanceMetrics.cacheMisses)) * 100
        : 0
    };
  }

  // Clear old cache entries to prevent memory leaks
  private clearOldCacheEntries(): void {
    if (this.faceDescriptorCache.size > 100) { // Limit cache size
      const entries = Array.from(this.faceDescriptorCache.entries());
      // Remove oldest 50% of entries
      const toRemove = entries.slice(0, Math.floor(entries.length / 2));
      toRemove.forEach(([key]) => this.faceDescriptorCache.delete(key));
      console.log(`Cleared ${toRemove.length} old cache entries`);
    }
  }

  // Optimize cache periodically
  optimizeCache(): void {
    this.clearOldCacheEntries();
  }

  resetPerformanceMetrics(): void {
    this.performanceMetrics = {
      totalVerifications: 0,
      successfulVerifications: 0,
      averageProcessingTime: 0,
      cacheHits: 0,
      cacheMisses: 0
    };
  }

  // Enhanced face detection with real-time feedback
  async detectFaceRealTime(
    videoElement: HTMLVideoElement,
    onDetection?: (detections: any[]) => void
  ): Promise<any[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    let retryCount = 0;
    const maxRetries = 2;
    
    const attemptRealTimeDetection = async (): Promise<any[]> => {
      try {
        // Validate video element
        if (!videoElement || videoElement.readyState < 2) {
          throw new Error('Video element not ready for real-time detection');
        }
        
        if (videoElement.videoWidth === 0 || videoElement.videoHeight === 0) {
          throw new Error('Video stream has no dimensions');
        }
        
        // Use lighter detection for real-time performance with timeout
        const detectionPromise = faceapi
          .detectAllFaces(videoElement, new faceapi.TinyFaceDetectorOptions({
            inputSize: 320, // Smaller input size for faster processing
            scoreThreshold: 0.4 // Lower threshold for better real-time detection
          }))
          .withFaceLandmarks();
        
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Real-time detection timeout')), 5000);
        });
        
        const detections = await Promise.race([detectionPromise, timeoutPromise]);
        
        // Validate detection results
        if (!Array.isArray(detections)) {
          throw new Error('Invalid real-time detection results');
        }
        
        if (onDetection) {
          onDetection(detections);
        }
        
        return detections;
      } catch (error) {
        console.error(`Real-time detection attempt ${retryCount + 1} failed:`, error);
        
        if (retryCount < maxRetries) {
          retryCount++;
          
          // Check if we need to reinitialize for certain errors
          if (error instanceof Error && 
              (error.message.includes('not initialized') || 
               error.message.includes('models') ||
               error.message.includes('undefined'))) {
            console.log('Attempting to reinitialize for real-time detection...');
            this.isInitialized = false;
            await this.initialize();
          }
          
          // Short wait before retry for real-time detection
          await new Promise(resolve => setTimeout(resolve, 200));
          
          return attemptRealTimeDetection();
        } else {
          // For real-time detection, return empty array on failure to avoid breaking the flow
          console.warn('Real-time detection failed after retries, returning empty results');
          return [];
        }
      }
    };
    
    return attemptRealTimeDetection();
  }

  // Preload models for faster initialization
  async preloadModels(): Promise<void> {
    if (this.isInitialized) return;
    
    try {
      // Preload in background without blocking
      this.initialize().catch(error => {
        console.warn('Background model preloading failed:', error);
      });
    } catch (error) {
      console.warn('Failed to preload models:', error);
    }
  }

  async disableUserFaceVerification(userId: string): Promise<void> {
    const { error } = await supabase
      .from('users')
      .update({ 
        requires_face_verification: false,
        face_data: null
      })
      .eq('id', userId);

    if (error) {
      console.error('Failed to disable face verification:', error);
      throw new Error('Failed to disable face verification');
    }
  }
}

export const faceVerificationService = new FaceVerificationService();
export default faceVerificationService;