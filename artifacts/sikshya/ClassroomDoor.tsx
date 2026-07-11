import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

// We gave the door a special key called "openTheDoor"
export default function ClassroomDoor({ openTheDoor }: any) {
  return (
    <View style={styles.container}>
      {/* When the button is pressed, it uses the key! */}
      <TouchableOpacity style={styles.button} onPress={openTheDoor}>
        <Text style={styles.buttonText}>🚪 Enter Video Class</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    alignItems: 'center',
  },
  button: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 10,
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});