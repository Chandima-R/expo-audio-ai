import {SafeAreaView, Text, View, StyleSheet, TouchableOpacity} from "react-native";
import {Picker} from "@react-native-picker/picker";
import {useState} from "react";
import {
    widthPercentageToDP as wp,
} from 'react-native-responsive-screen';
import { Image } from 'expo-image';
import {useNavigation} from '@react-navigation/native';
import {StatusBar} from "expo-status-bar";


export default function WelcomeScreen(){
    const [selectedLanguage, setSelectedLanguage] = useState('English');
    const [selectedGrade, setSelectedGrade] = useState('1');
    const navigation = useNavigation();
    return(
        <SafeAreaView style={styles.container}>
            <StatusBar style="auto" />
            <View style={styles.textContainer}>
                <Text
                    style={styles.titleText}>
                    Audio AI
                </Text>
                <Text
                    style={styles.detailsText}>
                    Future is here, powered by AI.
                </Text>
            </View>
            <View style={styles.imageContainer}>
                <Image
                    source={require('../../assets/welcome.png')}
                    style={{width: wp(75), height: wp(75)}}
                    contentFit="cover"
                    transition={1000}
                />
            </View>
            <View>
                <View style={styles.pickerContainer}>
                    <Picker
                        selectedValue={selectedLanguage}
                        onValueChange={itemValue => setSelectedLanguage(itemValue)}>
                        <Picker.Item label="English" value="English" />
                        <Picker.Item label="Sinhala" value="Sinhala" />
                        <Picker.Item label="Tamil" value="Tamil" />
                    </Picker>
                </View>
                <View style={styles.pickerContainer}>
                    <Picker
                        selectedValue={selectedGrade}
                        onValueChange={itemValue => setSelectedGrade(itemValue)}>
                        {Array.from({length: 13}, (_, i) => (
                            <Picker.Item
                                key={i.toString()}
                                label={`${i + 1}`}
                                value={`${i + 1}`}
                            />
                        ))}
                    </Picker>
                </View>
            </View>
            <TouchableOpacity
                style={styles.button}
                onPress={() =>
                    navigation.navigate('Home', {selectedGrade, selectedLanguage})
                }>
                <Text
                    style={styles.buttonText}
                >
                    Get Started
                </Text>
            </TouchableOpacity>
        </SafeAreaView>
    );

}

const styles = StyleSheet.create({
    container:{
        display: "flex",
        flex: 1,
        justifyContent: 'space-around',
        backgroundColor: 'white',
        padding: 20
    },
    textContainer:{
        marginTop: "0.5rem",
    },
    titleText:{
        textAlign: 'center',
        fontWeight: 'bold',
        color :'#3F3F46',
        fontSize: wp(10)
    },
    detailsText:{
        fontSize: wp(4),
        color:'#52525B',
        fontWeight: '600',
        textAlign: 'center',
    },
    imageContainer:{
        flexDirection: 'row',
        justifyContent: 'center'
    },
    pickerContainer: {
        borderWidth: 1,
        borderColor: '##34D399',
        borderRadius: 10,
        marginBottom: 10,
    },
    picker: {
        height: 40,
        width: '100%',
        paddingLeft: 10,
    },
    button:{
        backgroundColor: '#059669',
        zIndex: 50,
        padding: 10,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 10
    },
    buttonText:{
        fontSize: wp(6),
        color: '#fff',
        textAlign: 'center',
    }
})
