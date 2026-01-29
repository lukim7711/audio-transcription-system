"""
Audio Transcription Notebook for Kaggle
Processes YouTube videos using faster-whisper
"""

import os
import json
import time
import hmac
import hashlib
import requests
from pathlib import Path

# ============================================================================
# SETUP & DEPENDENCIES
# ============================================================================
print("📦 Installing dependencies...")
# UPDATE 1: Install yt-dlp dari GitHub Master untuk bypass 403 terbaru
os.system("pip install -q faster-whisper boto3 https://github.com/yt-dlp/yt-dlp/archive/master.zip")

import yt_dlp
from faster_whisper import WhisperModel
import boto3

# ... (Kode CONFIGURATION sampai HELPER FUNCTIONS biarkan sama) ...
# Salin ulang bagian bawah ini agar aman:

# ============================================================================
# CONFIGURATION FROM ENVIRONMENT
# ============================================================================

JOB_ID = os.environ.get('JOB_ID')
VIDEO_URL = os.environ.get('VIDEO_URL')
MODEL_SIZE = os.environ.get('MODEL_SIZE', 'medium')
LANGUAGE = os.environ.get('LANGUAGE', 'auto')
WEBHOOK_URL = os.environ.get('WEBHOOK_URL')
WEBHOOK_SECRET = os.environ.get('WEBHOOK_SECRET')

# R2 Configuration
R2_ENDPOINT = os.environ.get('R2_ENDPOINT')
R2_ACCESS_KEY = os.environ.get('R2_ACCESS_KEY')
R2_SECRET_KEY = os.environ.get('R2_SECRET_KEY')
R2_BUCKET = os.environ.get('R2_BUCKET', 'transcriptions')

print(f"\n✅ Configuration loaded:")
print(f"  Job ID: {JOB_ID}")
print(f"  Model: {MODEL_SIZE}")
print(f"  Language: {LANGUAGE}")
print(f"  Video URL: {VIDEO_URL[:50]}...")

def send_webhook(payload):
    """Send webhook with HMAC signature"""
    try:
        payload_json = json.dumps(payload)
        signature = hmac.new(
            WEBHOOK_SECRET.encode(),
            payload_json.encode(),
            hashlib.sha256
        ).hexdigest()
        
        response = requests.post(
            WEBHOOK_URL,
            data=payload_json,
            headers={
                'Content-Type': 'application/json',
                'X-Webhook-Signature': signature
            },
            timeout=30
        )
        
        if response.status_code != 200:
            print(f"⚠️  Webhook failed: {response.status_code} {response.text}")
        else:
            print(f"✅ Webhook sent successfully")
            
    except Exception as e:
        print(f"❌ Failed to send webhook: {str(e)}")

def send_webhook_error(error_code, error_message, error_details=None):
    payload = {
        'job_id': JOB_ID,
        'status': 'failed',
        'error_code': error_code,
        'error_message': error_message,
        'error_details': error_details or {},
        'processing_time': 0
    }
    send_webhook(payload)

def format_timestamp_srt(seconds):
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    millis = int((seconds % 1) * 1000)
    return f"{hours:02d}:{minutes:02d}:{secs:02d},{millis:03d}"

# ============================================================================
# STEP 1: DOWNLOAD AUDIO
# ============================================================================

print("\n" + "="*60)
print("STEP 1: DOWNLOADING AUDIO")
print("="*60)

try:
    audio_file = f'{JOB_ID}.m4a'
    
    # UPDATE 2: Konfigurasi Anti-Bot YouTube (Android Client)
    ydl_opts = {
        'format': 'bestaudio/best',
        'outtmpl': f'{JOB_ID}.%(ext)s',
        'postprocessors': [{
            'key': 'FFmpegExtractAudio',
            'preferredcodec': 'm4a',
        }],
        'quiet': False,
        'no_warnings': False,
        'nocheckcertificate': True,
        # Trik jitu bypass 403: Menyamar sebagai Android App
        'extractor_args': {
            'youtube': {
                'player_client': ['android', 'web']
            }
        }
    }
    
    print(f"🎵 Downloading audio from: {VIDEO_URL}")
    
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(VIDEO_URL, download=True)
        video_title = info.get('title', 'Unknown')
        video_duration = info.get('duration', 0)
        
    print(f"✅ Audio downloaded: {video_title}")
    print(f"   Duration: {video_duration} seconds")
    
except Exception as e:
    error_message = f"Failed to download audio: {str(e)}"
    print(f"❌ {error_message}")
    send_webhook_error('DOWNLOAD_FAILED', error_message, {'error': str(e)})
    raise

# ============================================================================
# STEP 2: TRANSCRIBE WITH FASTER-WHISPER
# ============================================================================

print("\n" + "="*60)
print("STEP 2: TRANSCRIBING AUDIO")
print("="*60)

start_time = time.time()

try:
    print(f"🤖 Loading Whisper model: {MODEL_SIZE}")
    model = WhisperModel(MODEL_SIZE, device="cuda", compute_type="float32")
    
    print(f"🎙️  Starting transcription...")
    language_param = None if LANGUAGE == 'auto' else LANGUAGE
    
    segments, info = model.transcribe(
        audio_file,
        language=language_param,
        word_timestamps=True,
        vad_filter=True,
        vad_parameters=dict(min_silence_duration_ms=500)
    )
    
    print(f"✅ Detected language: {info.language}")
    print(f"   Processing segments...")
    
    # Build transcript data
    transcript_data = {
        "text": "",
        "segments": [],
        "language": info.language,
        "duration": info.duration,
        "model": MODEL_SIZE
    }
    
    for segment in segments:
        words = []
        if segment.words:
            for word in segment.words:
                words.append({
                    "word": word.word,
                    "start": round(word.start, 2),
                    "end": round(word.end, 2),
                    "probability": round(word.probability, 2)
                })
        
        segment_data = {
            "id": segment.id,
            "start": round(segment.start, 2),
            "end": round(segment.end, 2),
            "text": segment.text.strip(),
            "words": words
        }
        transcript_data["segments"].append(segment_data)
        transcript_data["text"] += segment.text.strip() + " "
    
    transcript_data["text"] = transcript_data["text"].strip()
    
    processing_time = int(time.time() - start_time)
    print(f"✅ Transcription completed in {processing_time} seconds")
    print(f"   Total segments: {len(transcript_data['segments'])}")
    
except Exception as e:
    error_message = f"Transcription failed: {str(e)}"
    print(f"❌ {error_message}")
    send_webhook_error('TRANSCRIPTION_FAILED', error_message, {'error': str(e)})
    raise

# ============================================================================
# STEP 3: GENERATE MULTIPLE FORMATS
# ============================================================================

print("\n" + "="*60)
print("STEP 3: GENERATING FORMATS")
print("="*60)

try:
    # JSON format
    json_file = f'{JOB_ID}_transcript.json'
    with open(json_file, 'w', encoding='utf-8') as f:
        json.dump(transcript_data, f, ensure_ascii=False, indent=2)
    print(f"✅ Generated JSON: {json_file}")
    
    # SRT format
    srt_file = f'{JOB_ID}_transcript.srt'
    srt_content = ""
    for i, seg in enumerate(transcript_data['segments'], 1):
        start = format_timestamp_srt(seg['start'])
        end = format_timestamp_srt(seg['end'])
        srt_content += f"{i}\n{start} --> {end}\n{seg['text']}\n\n"
    
    with open(srt_file, 'w', encoding='utf-8') as f:
        f.write(srt_content)
    print(f"✅ Generated SRT: {srt_file}")
    
    # TXT format
    txt_file = f'{JOB_ID}_transcript.txt'
    with open(txt_file, 'w', encoding='utf-8') as f:
        f.write(transcript_data['text'])
    print(f"✅ Generated TXT: {txt_file}")
    
except Exception as e:
    error_message = f"Failed to generate formats: {str(e)}"
    print(f"❌ {error_message}")
    send_webhook_error('TRANSCRIPTION_FAILED', error_message, {'error': str(e)})
    raise

# ============================================================================
# STEP 4: UPLOAD TO R2 STORAGE
# ============================================================================

print("\n" + "="*60)
print("STEP 4: UPLOADING TO R2 STORAGE")
print("="*60)

try:
    # Initialize S3 client for R2
    s3 = boto3.client(
        's3',
        endpoint_url=R2_ENDPOINT,
        aws_access_key_id=R2_ACCESS_KEY,
        aws_secret_access_key=R2_SECRET_KEY
    )
    
    files_to_upload = [
        (json_file, f'jobs/{JOB_ID}/transcript.json', 'application/json'),
        (srt_file, f'jobs/{JOB_ID}/transcript.srt', 'text/plain'),
        (txt_file, f'jobs/{JOB_ID}/transcript.txt', 'text/plain'),
        (audio_file, f'jobs/{JOB_ID}/audio.m4a', 'audio/mp4')
    ]
    
    uploaded_urls = {}
    for local_file, s3_key, content_type in files_to_upload:
        print(f"⬆️  Uploading {local_file}...")
        s3.upload_file(
            local_file,
            R2_BUCKET,
            s3_key,
            ExtraArgs={
                'ContentType': content_type,
                'CacheControl': 'public, max-age=31536000'
            }
        )
        # Construct public URL
        # UPDATE: Menggunakan R2_PUBLIC_URL dari environment variable yang valid
        public_domain = os.environ.get('R2_PUBLIC_URL')
        if public_domain:
            # Hapus slash di akhir jika ada, untuk konsistensi
            public_domain = public_domain.rstrip('/')
            uploaded_urls[s3_key] = f"{public_domain}/{s3_key}"
        else:
            # Fallback jika lupa setting variable (meski akan error di frontend)
            print("⚠️ WARNING: R2_PUBLIC_URL not set!")
            uploaded_urls[s3_key] = f"{R2_ENDPOINT}/{R2_BUCKET}/{s3_key}"
        print(f"✅ Uploaded to: {s3_key}")
    
    print(f"✅ All files uploaded successfully")
    
except Exception as e:
    error_message = f"Failed to upload files: {str(e)}"
    print(f"❌ {error_message}")
    send_webhook_error('UPLOAD_FAILED', error_message, {'error': str(e)})
    raise

# ============================================================================
# STEP 5: SEND SUCCESS WEBHOOK
# ============================================================================

print("\n" + "="*60)
print("STEP 5: SENDING SUCCESS WEBHOOK")
print("="*60)

try:
    payload = {
        'job_id': JOB_ID,
        'status': 'completed',
        'transcript_url': uploaded_urls[f'jobs/{JOB_ID}/transcript.json'],
        'audio_url': uploaded_urls[f'jobs/{JOB_ID}/audio.m4a'],
        'srt_url': uploaded_urls[f'jobs/{JOB_ID}/transcript.srt'],
        'txt_url': uploaded_urls[f'jobs/{JOB_ID}/transcript.txt'],
        'video_title': video_title,
        'video_duration': video_duration,
        'processing_time': processing_time
    }
    
    send_webhook(payload)
    
    print("\n" + "="*60)
    print("✅ JOB COMPLETED SUCCESSFULLY!")
    print("="*60)
    print(f"Total processing time: {processing_time} seconds")
    
except Exception as e:
    error_message = f"Failed to send success webhook: {str(e)}"
    print(f"❌ {error_message}")
    # Don't raise here, job is already done