from flask import Flask, request, jsonify, send_file
import os
import subprocess
import requests
import uuid

app = Flask(__name__)

target_server_url = "http://192.168.57.227:5000/chatbot"


@app.route('/chatbot', methods=['POST'], endpoint='chatbot_post')
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

            mp3_folder = 'mp3'
            os.makedirs(mp3_folder, exist_ok=True)

            mp3_filename = unique_filename.replace(
                '.wav', '.mp3')
            mp3_save_path = os.path.join(mp3_folder, mp3_filename)

            with open(mp3_save_path, 'wb') as mp3_file:
                mp3_file.write(mp3_content)

            return jsonify({'filename': mp3_filename})

        print('Failed to send audio to the target server')
        return jsonify({'error': 'Failed to send audio to the target server'}), 500

    except Exception as e:
        print('An error occurred:', str(e))
        return jsonify({'error': 'An error occurred'}), 500


@app.route('/chatbot', methods=['GET'], endpoint='chatbot_get')
def chatbot():
    try:
        mp3_filename = request.args.get('filename')
        print(mp3_filename)
        if not mp3_filename:
            return jsonify({'error': 'Missing "filename" parameter'}), 400

        mp3_directory = 'mp3'
        mp3_path = os.path.join(mp3_directory, mp3_filename)

        if os.path.exists(mp3_path):
            print('MP3 file found', mp3_path)
            return send_file(mp3_path, mimetype='audio/mp3')
        else:
            return jsonify({'error': 'MP3 file not found'}), 404

    except Exception as e:
        print('An error occurred:', str(e))
        return jsonify({'error': 'An error occurred'}), 500


if __name__ == '__main__':
    app.run(host='192.168.57.227', port=5050, debug=True)
