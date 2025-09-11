// components/AnimatedTabBar.jsx
import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { BottomTabBar } from '@react-navigation/bottom-tabs';

export default function AnimatedTabBar(props) {
    const y = useRef(new Animated.Value(0)).current; // 0 = visível

    // escuta flag vinda por options do parent (ex: props.desiredHidden)
    const hidden = props.state?.routes?.[props.state.index]?.params?.hideTabBar;

    useEffect(() => {
        Animated.timing(y, {
            toValue: hidden ? 80 : 0, // empurra pra baixo
            duration: 220,
            useNativeDriver: true,
        }).start();
    }, [hidden]);

    return (
        <Animated.View style={[styles.wrap, { transform: [{ translateY: y }] }]}>
            <BottomTabBar {...props} />
        </Animated.View>
    );
}
const styles = StyleSheet.create({ wrap: { overflow: 'hidden' } });