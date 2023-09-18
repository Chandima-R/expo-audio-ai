    import { StatusBar } from 'expo-status-bar';
    import React, { useState, useEffect } from 'react';
    import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
    import { Audio } from 'expo-av';
    import { useRoute } from "@react-navigation/native";
    import { widthPercentageToDP as wp } from "react-native-responsive-screen";
    import { Image } from "expo-image";
    import axios from 'axios'; // Import Axios for making HTTP requests

    export default function HomeScreen() {
        const [recording, setRecording] = useState(null);
        const [recordings, setRecordings] = useState([]);
        const [message, setMessage] = useState("");
        const [playingSound, setPlayingSound] = useState(null);
        const [playingSoundIndex, setPlayingSoundIndex] = useState(null);
        const [isRecording, setIsRecording] = useState(false);
        const [recordedAudioData, setRecordedAudioData] = useState(null); // Add this state variable


        const route = useRoute();
        const { selectedLanguage, selectedGrade } = route.params;

        useEffect(() => {
            // Initialize audio recording when the component mounts
            (async () => {
                const { status } = await Audio.requestPermissionsAsync();
                if (status === 'granted') {
                    const recordingObject = new Audio.Recording();
                    await recordingObject.prepareToRecordAsync(Audio.RECORDING_OPTIONS_PRESET_HIGH_QUALITY);
                    setRecording(recordingObject);
                }
            })();
        }, []);

        async function sendAudioToAPI(audioData, selectedLanguage, selectedGrade) {
            try {
                // Replace 'YOUR_API_URL' with the actual URL of your API endpoint
                const apiUrl = 'http://127.0.0.1:5000/chatbot';

                // Convert audio data to Base64 encoding
                const audioBase64 = audioData.toString('base64');

                // Define the request body with language, grade, and audio data
                const requestBody = {
                    language: selectedLanguage,
                    grade: selectedGrade,
                    audio: audioBase64,
                    // Add any other metadata required by your API
                };

                // Make an HTTP POST request to send the audio data
                const response = await axios.post(apiUrl, requestBody);

                // Handle the API response as needed
                console.log('API response:', response.data);

                // You can also update your UI with a success message or perform other actions
            } catch (error) {
                // Handle errors, e.g., network issues or API errors
                console.error('Failed to send audio to API:', error);

                // You can also update your UI with an error message or perform other error-handling actions
            }
        }

        async function startRecording() {
            try {
                if (recording) {
                    await recording.startAsync();
                    setIsRecording(true);
                } else {
                    setMessage("Recording object is not available. Please wait for initialization to complete.");
                }
            } catch (err) {
                console.error('Failed to start recording', err);
            }
        }


        async function stopRecording() {
            if (recording) {
                setIsRecording(false);
                try {
                    await recording.stopAndUnloadAsync();
                    let updatedRecordings = [...recordings];
                    const { sound, status } = await recording.createNewLoadedSoundAsync();
                    updatedRecordings.push({
                        sound: sound,
                        duration: getDurationFormatted(status.durationMillis),
                        file: recording.getURI()
                    });
                    setRecordings(updatedRecordings);

                    // Update the recorded audio data in the state
                    const audioData = await recording.getURI();
                    setRecordedAudioData(audioData);

                    // Send the recorded audio, selectedLanguage, and selectedGrade to the API
                    await sendAudioToAPI(audioData, selectedLanguage, selectedGrade);
                } catch (err) {
                    console.error('Failed to stop recording', err);
                }
            }
        }


        function getDurationFormatted(millis) {
            const minutes = millis / 1000 / 60;
            const minutesDisplay = Math.floor(minutes);
            const seconds = Math.round((minutes - minutesDisplay) * 60);
            const secondsDisplay = seconds < 10 ? `0${seconds}` : seconds;
            return `${minutesDisplay}:${secondsDisplay}`;
        }

        function getRecordingLines() {
            return recordings.map((recordingLine, index) => {
                const isPlaying = playingSoundIndex === index;
                return (
                    <View key={index} style={styles.row}>
                        <Text style={styles.fill}>
                            Recording {index + 1} - {recordingLine.duration}
                        </Text>
                        <TouchableOpacity
                            style={styles.messageListButton}
                            onPress={() => {
                                if (isPlaying) {
                                    // If the recording is already playing, stop it
                                    playingSound.stopAsync();
                                    setPlayingSound(null);
                                    setPlayingSoundIndex(null);
                                } else {
                                    // If it's not playing, start playing it
                                    recordingLine.sound.replayAsync();
                                    setPlayingSound(recordingLine.sound);
                                    setPlayingSoundIndex(index);
                                }
                            }}
                        >
                            <Text style={styles.messageListButtonText}>
                                {isPlaying ? "Stop" : "Play"}
                            </Text>
                        </TouchableOpacity>
                    </View>
                );
            });
        }

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
                    {getRecordingLines()}
                </ScrollView>

                <TouchableOpacity
                    style={styles.recordingButton}
                    onPress={isRecording ? stopRecording : startRecording}>
                    <Text style={styles.buttonText}>{isRecording ? 'Stop Recording' : 'Start Recording'}</Text>
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
            width: '100%'
        },
        buttonText: {
            fontSize: wp(4),
            color: '#fff',
            textAlign: 'center',
        },
        imageContainer: {
            display: 'flex',
            alignItems: "center",
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
            marginTop: 10
        },
        messageListTitle: {
            fontSize: wp(4),
            textTransform: 'capitalize'
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
        }
    });
