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

  export default function HomeScreen() {
    const [recording, setRecording] = useState(null);
    const [recordings, setRecordings] = useState([]);
    const [message, setMessage] = useState('');
    const [playingSound, setPlayingSound] = useState(null);
    const [playingSoundIndex, setPlayingSoundIndex] = useState(null);
    const [isRecording, setIsRecording] = useState(false);
    const [recordedAudioData, setRecordedAudioData] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [responseAvailable, setResponseAvailable] = useState(false);

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
        const apiUrl = 'https://536d-2402-4000-b281-f462-25ff-529d-118a-258b.ngrok-free.app/chatbot';

        const formData = new FormData();
        formData.append('language', selectedLanguage);
        formData.append('grade', selectedGrade);
        formData.append('audio', {
          uri: audioData,
          name: 'audio.wav',
          type: 'audio/wav',
        });

        setIsLoading(true); // Enable loading indicator

        const response = await axios.post(apiUrl, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
            'Accept': 'audio/mpeg',
          },
        });
        setIsLoading(false); // Disable loading indicator

        if (response?.data) {
          console.log('MP3 found');
          setResponseAvailable(true); // Set to true when a response is available
        } else {
          console.error(401, 'API response does not contain audio URL');
        }

      } catch (error) {
        console.error('Failed to send audio to API:', error);
        setIsLoading(false); // Disable loading indicator on error
      }
    }

    const startRecording = async () => {
      try {
        if (recording) {
          setIsLoading(true); // Enable loading indicator
          await recording.startAsync();
          setIsRecording(true);
          setIsLoading(false); // Disable loading indicator
        } else {
          setMessage(
              'Recording object is not available. Please wait for initialization to complete.'
          );
        }
      } catch (error) {
        console.error('Failed to start recording:', error);
        setIsLoading(false); // Disable loading indicator on error
      }
    };

    const stopRecording = async () => {
      if (recording) {
        setIsLoading(true); // Enable loading indicator
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
          setIsLoading(false); // Disable loading indicator
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

          {responseAvailable && (
              <TouchableOpacity
                  style={styles.downloadButton}
                  onPress={() => {
                    // Implement your logic to download the response here
                  }}
              >
                <Text style={styles.downloadButtonText}>Download Response</Text>
              </TouchableOpacity>
          )}

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
      backgroundColor: '#ccc', // You can choose a suitable disabled color
      zIndex: 50,
      padding: 10,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '100%',
      opacity: 0.6, // You can adjust the opacity to make it visually disabled
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
      backgroundColor: '#3498db', // Customize the color as needed
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