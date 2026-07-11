import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Daily from '@daily-co/react-native-daily-js';

export default function VideoRoom() {
  
  // When someone walks in, this plugs the antenna into the wall automatically!
  useEffect(() => {
    const callObject = Daily.createCallObject();
    
    // When they leave the room, this unplugs it to save power!
    return () => {
      callObject.destroy();
    };
  }, []);

  return (
    <View style={styles.room}>
      <Text style={styles.titleText}>Class is in Session!</Text>
      
      {/* This is our brand-new TV screen hanging on the wall */}
      <View style={styles.tvScreen}>
        <Text style={styles.waitingText}>📷 The camera will turn on here!</Text>
      </View>
      
    </View>
  );
}

const styles = StyleSheet.create({
  room: {
    flex: 1,
    backgroundColor: '#1e1e1e', // A dark movie-theater background
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleText: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
  },
  tvScreen: {
    width: 300,
    height: 400,
    backgroundColor: '#000000', // The dark glass of the TV
    borderColor: '#4CAF50',     // A cool green border around the TV
    borderWidth: 4,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  waitingText: {
    color: '#cccccc',
    fontSize: 16,
  },
});