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
import * as FileSystem from 'expo-file-system';

export default function HomeScreen() {
  const [recording, setRecording] = useState(null);
  const [recordings, setRecordings] = useState([]);
  const [message, setMessage] = useState('');
  const [playingSound, setPlayingSound] = useState(null);
  const [playingSoundIndex, setPlayingSoundIndex] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedAudioData, setRecordedAudioData] = useState(null);
  const [downloadedAudioUri, setDownloadedAudioUri] = useState(null);
  const [isPlayingDownloadedAudio, setIsPlayingDownloadedAudio] = useState(
    false
  );

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
        const recordingOptions = {
          ios: {
            extension: '.wav',
          },
          android: {
            extension: '.wav',
            outputFormat: Audio.RECORDING_OPTION_ANDROID_OUTPUT_FORMAT_WAV,
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

  async function sendAudioToAPI(audioData, selectedLanguage, selectedGrade) {
    try {
      const apiUrl = 'http://192.168.8.133:5000/chatbot';
  
      const formData = new FormData();
      formData.append('language', selectedLanguage);
      formData.append('grade', selectedGrade);
      formData.append('audio', {
        uri: audioData,
        name: 'audio.wav',
        type: 'audio/wav',
      });
  
      console.log('Sending audio data:', audioData);
  
      const response = await axios.post(apiUrl, formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
            'Accept': 'audio/mpeg', 
        },
      });
  
      console.log('API response:', response.data);
  
      if (response.data.audioUrl) {
       
        const { uri } = await FileSystem.downloadAsync(
          response.data.audioUrl,
          FileSystem.cacheDirectory + 'audio.mp3'
        );

        console.log(58)
  
        setDownloadedAudioUri(uri);
      } else {
        console.error('API response does not contain audio URL');
      }
    } catch (error) {
      console.error('Failed to send audio to API:', error);
    }
  }
  
  const startRecording = async () => {
    try {
      if (recording) {
        await recording.startAsync();
        setIsRecording(true);
      } else {
        setMessage(
          'Recording object is not available. Please wait for initialization to complete.'
        );
      }
    } catch (error) {
      console.error('Failed to start recording:', error);
    }
  };

  const stopRecording = async () => {
    if (recording) {
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
      }
    }
  };

  const toggleDownloadedAudioPlayback = () => {
    if (isPlayingDownloadedAudio) {
      playingSound.stopAsync();
      setPlayingSound(null);
      setIsPlayingDownloadedAudio(false);
    } else if (downloadedAudioUri) {
      const soundObject = new Audio.Sound();
      soundObject
        .loadAsync({ uri: downloadedAudioUri })
        .then(() => {
          soundObject.playAsync();
          soundObject.setOnPlaybackStatusUpdate((status) => {
            if (!status.isPlaying) {
              soundObject.unloadAsync();
              setIsPlayingDownloadedAudio(false);
            }
          });
        })
        .catch((error) => {
          console.error('Failed to load audio:', error);
        });

      setPlayingSound(soundObject);
      setIsPlayingDownloadedAudio(true);
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

      {downloadedAudioUri && (
        <View style={styles.row}>
          <Text style={styles.fill}>Downloaded Audio</Text>
          <TouchableOpacity
            style={styles.messageListButton}
            onPress={toggleDownloadedAudioPlayback}
          >
            <Text style={styles.messageListButtonText}>
              {isPlayingDownloadedAudio ? 'Stop' : 'Play'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <TouchableOpacity
        style={styles.recordingButton}
        onPress={isRecording ? stopRecording : startRecording}
      >
        <Text style={styles.buttonText}>
          {isRecording ? 'Stop Recording' : 'Start Recording'}
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
});
