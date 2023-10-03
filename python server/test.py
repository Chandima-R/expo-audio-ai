from flask import Flask, request, jsonify, send_file
import os
import subprocess
import requests
import uuid
import io

app = Flask(__name__)

target_server_url = "https://fdd7-112-135-79-111.ngrok-free.app/chatbot"


@app.route('/chatbot', methods=['POST'])
def chatbot():
    try:
        if 'audio' not in request.files:
            return jsonify({'error': 'No audio file provided'}), 400

        audio_file = request.files['audio']

        allowed_extensions = {'m4a'}
        if not audio_file.filename.lower().endswith(tuple(allowed_extensions)):
            return jsonify({'error': 'Invalid file format. Only m4a is allowed'}), 400

        temp_audio_path = 'temp_audio.m4a'
        audio_file.save(temp_audio_path)

        output_audio_path = 'converted_audio.wav'
        command = "ffmpeg -i {} -acodec pcm_s16le -ar 44100 -ac 2 {}".format(
            temp_audio_path, output_audio_path)
        subprocess.call(command, shell=True)

        os.remove(temp_audio_path)

        save_folder = 'audio_folder'
        os.makedirs(save_folder, exist_ok=True)

        unique_filename = str(uuid.uuid4()) + '.wav'
        save_path = os.path.join(save_folder, unique_filename)

        os.rename(output_audio_path, save_path)

        data = {
            'language': request.form['language'],
            'grade': request.form['grade']
        }

        files = {'audio': open(save_path, 'rb')}
        response = requests.post(target_server_url, data=data, files=files)

        if response.status_code == 200:
            print('Audio converted and sent successfully to the target server')
            mp3_content = response.content  
            return send_file(io.BytesIO(mp3_content), mimetype='audio/mp3')

        print('Failed to send audio to the target server')
        return jsonify({'error': 'Failed to send audio to the target server'}), 500
    
    except Exception as e:
        print('An error occurred:', str(e))
        return jsonify({'error': 'An error occurred'}), 500

if __name__ == '__main__':
    app.run(host='192.168.1.26', port=5050, debug=True)
