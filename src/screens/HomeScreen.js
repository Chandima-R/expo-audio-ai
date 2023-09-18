import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import { Audio } from 'expo-av';
import {useRoute} from "@react-navigation/native";
import {widthPercentageToDP as wp} from "react-native-responsive-screen";
import {Image} from "expo-image";

export default function HomeScreen() {
    const [recording, setRecording] = React.useState();
    const [recordings, setRecordings] = React.useState([]);
    const [message, setMessage] = React.useState("");
    const [playingSound, setPlayingSound] = React.useState(null);
    const [playingSoundIndex, setPlayingSoundIndex] = React.useState(null);


    const route = useRoute()
    const {selectedLanguage, selectedGrade} = route.params

    async function startRecording() {
        try {
            const permission = await Audio.requestPermissionsAsync();

            if (permission.status === "granted") {
                await Audio.setAudioModeAsync({
                    allowsRecordingIOS: true,
                    playsInSilentModeIOS: true
                });

                const { recording } = await Audio.Recording.createAsync(
                    Audio.RECORDING_OPTIONS_PRESET_HIGH_QUALITY
                );

                setRecording(recording);
            } else {
                setMessage("Please grant permission to app to access microphone");
            }
        } catch (err) {
            console.error('Failed to start recording', err);
        }
    }

    async function stopRecording() {
        setRecording(undefined);
        await recording.stopAndUnloadAsync();

        let updatedRecordings = [...recordings];
        const { sound, status } = await recording.createNewLoadedSoundAsync();
        updatedRecordings.push({
            sound: sound,
            duration: getDurationFormatted(status.durationMillis),
            file: recording.getURI()
        });

        setRecordings(updatedRecordings);
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
                   style={{width: wp(20), height: wp(20), marginRight: 20}}
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
                onPress={recording ? stopRecording : startRecording}>
                <Text style={styles.buttonText}>{recording ? 'Stop Recording' : 'Start Recording'}</Text>
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
    recordingButton:{
        backgroundColor: '#059669',
        zIndex: 50,
        padding: 10,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%'
    },
    buttonText:{
        fontSize: wp(4),
        color: '#fff',
        textAlign: 'center',
    },
    imageContainer:{
        display: 'flex',
        alignItems: "center",
        justifyContent: 'flex-start',
        flexDirection: 'row',
    },
    logoImage:{
        marginRight: 20,
        width: '100%',
        backgroundColor: '#0553',
    },
    languageText:{
        fontSize: wp(4),
    },
    gradeText:{
        fontSize: wp(4),
    },
    messageList:{
        backgroundColor: '#fafafa',
        flex: 1,
        width: '100%',
        padding: 10,
        marginTop: 10
    },
    messageListTitle:{
        fontSize: wp(4),
        textTransform: 'capitalize'
    },
    row:{
        display: 'flex',
        flexDirection: 'row',
        width: '100%',
        justifyContent: 'space-between',
        marginBottom: 5,
    },
    messageListButton:{

        backgroundColor: '#34D399',
        padding:10,
        borderRadius: 5,
    },
    messageListButtonText:{
        fontSize: wp(4),
        color: '#fff',
    }
});
