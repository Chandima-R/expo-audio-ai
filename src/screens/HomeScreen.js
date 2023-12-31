  import { StatusBar } from 'expo-status-bar';
  import React, { useState, useEffect } from 'react';
  import {
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
  } from 'react-native';
  import { Audio } from 'expo-av';
  import { useRoute } from '@react-navigation/native';
  import { widthPercentageToDP as wp } from 'react-native-responsive-screen';
  import { Image } from 'expo-image';
  import axios from 'axios';
  import { Buffer } from "buffer";
  import * as FileSystem from 'expo-file-system'
  import mime from "mime";

  export default function HomeScreen() {
    const [recording, setRecording] = useState(null);
    const [recordings, setRecordings] = useState([]);
    const [message, setMessage] = useState('');
    const [playingSound, setPlayingSound] = useState(null);
    const [playingSoundIndex, setPlayingSoundIndex] = useState(null);
    const [isRecording, setIsRecording] = useState(false);
    const [recordedAudioData, setRecordedAudioData] = useState(null);
    const [isLoading, setIsLoading] = useState(false)
    const [sound, setSound] = useState();
    const [isPlaying, setIsPlaying] = useState(false);

    const route = useRoute();
    const { selectedLanguage, selectedGrade } = route.params;

    useEffect(() => {
      initializeRecording();
    }, []);

    const initializeRecording = async () => {
      try {
        const { status } = await Audio.requestPermissionsAsync();
        if (status === 'granted') {
          const recordingObject = new Audio.Recording();
          recordingObject.set
          const recordingOptions = {
            android: {
              extension: '.m4a',
              outputFormat: Audio.AndroidOutputFormat.MPEG_4,
              audioEncoder: Audio.AndroidAudioEncoder.AAC,
              sampleRate: 44100,
              numberOfChannels: 2,
              bitRate: 128000,
            },
            ios: {
              extension: '.m4a',
              outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
              audioQuality: Audio.IOSAudioQuality.MAX,
              sampleRate: 44100,
              numberOfChannels: 2,
              bitRate: 128000,
              linearPCMBitDepth: 16,
              linearPCMIsBigEndian: false,
              linearPCMIsFloat: false,
            },
            web: {
              mimeType: 'audio/webm',
              bitsPerSecond: 128000,
            },
          };
          await recordingObject.prepareToRecordAsync(recordingOptions);

          setRecording(recordingObject);
        } else {
          setMessage('Audio permissions not granted.');
        }
      } catch (error) {
        console.error('Failed to initialize recording:', error);
      }
    };


    const playAudio = async (audioUrl) => {
      if (sound) {
        await sound.unloadAsync();
      }

      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: audioUrl }
      );
      setSound(newSound);
      await newSound.playAsync();
      setIsPlaying(true);
    };

    const saveMP3ResponseToLocal = async (response) => {
      try {
        const directory = FileSystem.documentDirectory + 'my-mp3s/';
        const directoryInfo = await FileSystem.getInfoAsync(directory);
        const fileName = `${Date.now()}.mp3`;
        if (!directoryInfo.exists) {
          await FileSystem.makeDirectoryAsync(directory);
        }

        const filePath = `${directory}${fileName}`;
        const savedFileUri = FileSystem.documentDirectory + 'my-mp3s/' + fileName;

        const base64Data = response.data;
        const mp3Data = Buffer.from(base64Data, 'base64').toString('binary');

        await FileSystem.writeAsStringAsync(filePath, mp3Data, { encoding: FileSystem.EncodingType.Binary });

        const { sound, status } = await Audio.Sound.createAsync(
            { uri: savedFileUri },
            { shouldPlay: true }
        );

        if (status.isLoaded) {
          await sound.playAsync();
        }

        return savedFileUri;
      } catch (error) {
        console.error('Failed to save MP3 response:', error);
        return null;
      }
    };


    async function sendAudioToAPI(audioData, selectedLanguage, selectedGrade) {
      try {
        const apiUrl = 'http://192.168.1.26:5050/chatbot';

        const formData = new FormData();
        formData.append('language', selectedLanguage);
        formData.append('grade', selectedGrade);
        formData.append('audio', {
          uri: audioData,
          name: 'audio.m4a',
          type: 'audio/m4a',
        });

        setIsLoading(true);

        const response = await axios.post(apiUrl, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
            'Accept': 'audio/mpeg',
          },
        });
        setIsLoading(false);



        if (response?.data) {
          console.log('MP3 found');
          const localUri = await saveMP3ResponseToLocal(response);
          console.log(localUri)

        } else {
          console.error(401, 'API response does not contain audio URL');
        }

      } catch (error) {
        console.error('Failed to send audio to API:', error);
        setIsLoading(false);
      }
    }

    const startRecording = async () => {
      try {
        if (recording) {
          setIsLoading(true);
          await recording.startAsync();
          setIsRecording(true);
          setIsLoading(false);
        } else {
          setMessage(
            'Recording object is not available. Please wait for initialization to complete.'
          );
        }
      } catch (error) {
        console.error('Failed to start recording:', error);
        setIsLoading(false);
      }
    };

    const stopRecording = async () => {
      if (recording) {
        setIsLoading(true);
        setIsRecording(false);
        try {
          await recording.stopAndUnloadAsync();
          const updatedRecordings = [...recordings];
          const { sound, status } = await recording.createNewLoadedSoundAsync();
          updatedRecordings.push({
            sound: sound,
            duration: getDurationFormatted(status.durationMillis),
            file: recording.getURI(),
          });
          setRecordings(updatedRecordings);

          const audioData = await recording.getURI();
          setRecordedAudioData(audioData);

          await sendAudioToAPI(audioData, selectedLanguage, selectedGrade);
        } catch (error) {
          console.error('Failed to stop recording:', error);
        } finally {
          setIsLoading(false);
        }
      }
    };
    const getDurationFormatted = (millis) => {
      const minutes = millis / 1000 / 60;
      const minutesDisplay = Math.floor(minutes);
      const seconds = Math.round((minutes - minutesDisplay) * 60);
      const secondsDisplay = seconds < 10 ? `0${seconds}` : seconds;
      return `${minutesDisplay}:${secondsDisplay}`;
    };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.imageContainer}>
        <Image
          source={require('../../assets/welcome.png')}
          style={{ width: wp(20), height: wp(20), marginRight: 20 }}
          contentFit="cover"
          transition={1000}
        />
        <View>
          <Text style={styles.languageText}>Language: {selectedLanguage}</Text>
          <Text style={styles.gradeText}>Grade: {selectedGrade}</Text>
        </View>
      </View>

      <ScrollView style={styles.messageList}>
        <Text style={styles.messageListTitle}>Responses</Text>
        <Text>{message}</Text>
        {recordings.map((recordingLine, index) => (
          <View key={index} style={styles.row}>
            <Text style={styles.fill}>
              Recording {index + 1} - {recordingLine.duration}
            </Text>
            <TouchableOpacity
              style={styles.messageListButton}
              onPress={() => {
                if (playingSoundIndex === index) {
                  playingSound.stopAsync();
                  setPlayingSound(null);
                  setPlayingSoundIndex(null);
                } else {
                  recordingLine.sound.replayAsync();
                  setPlayingSound(recordingLine.sound);
                  setPlayingSoundIndex(index);
                }
              }}
            >
              <Text style={styles.messageListButtonText}>
                {playingSoundIndex === index ? 'Stop' : 'Play'}
              </Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>

      <TouchableOpacity
        style={[styles.recordingButton, isLoading && styles.disabledButton]}
        onPress={isRecording ? stopRecording : startRecording}
        disabled={isLoading}
      >
        <Text style={styles.buttonText}>
          {isLoading ? 'Loading...' : isRecording ? 'Stop Recording' : 'Start Recording'}
        </Text>
      </TouchableOpacity>
      <StatusBar style="auto" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 60,
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  recordingButton: {
    backgroundColor: '#059669',
    zIndex: 50,
    padding: 10,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  buttonText: {
    fontSize: wp(4),
    color: '#fff',
    textAlign: 'center',
  },
  disabledButton: {
    backgroundColor: '#ccc',
    zIndex: 50,
    padding: 10,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    opacity: 0.6,
  },
  imageContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-start',
    flexDirection: 'row',
  },
  logoImage: {
    marginRight: 20,
    width: '100%',
    backgroundColor: '#0553',
  },
  languageText: {
    fontSize: wp(4),
  },
  gradeText: {
    fontSize: wp(4),
  },
  messageList: {
    backgroundColor: '#fafafa',
    flex: 1,
    width: '100%',
    padding: 10,
    marginTop: 10,
  },
  messageListTitle: {
    fontSize: wp(4),
    textTransform: 'capitalize',
  },
  row: {
    display: 'flex',
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  messageListButton: {
    backgroundColor: '#34D399',
    padding: 10,
    borderRadius: 5,
  },
  messageListButtonText: {
    fontSize: wp(4),
    color: '#fff',
  },
  downloadButton: {
    backgroundColor: '#3498db',
    padding: 10,
    borderRadius: 5,
    marginTop: 10,
  },
  downloadButtonText: {
    fontSize: wp(4),
    color: '#fff',
    textAlign: 'center',
  },
});