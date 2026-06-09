// components/SplashLoadingScreen.jsx
import React, { useEffect, useRef } from "react";
import {
	Animated,
	Easing,
	Image,
	StyleSheet,
	Text,
	View,
} from "react-native";

export default function SplashLoadingScreen() {
	const spin = useRef(new Animated.Value(0)).current;
	const pulse = useRef(new Animated.Value(1)).current;

	useEffect(() => {
		const spinLoop = Animated.loop(
			Animated.timing(spin, {
				toValue: 1,
				duration: 900,
				easing: Easing.linear,
				useNativeDriver: true,
			})
		);

		const pulseLoop = Animated.loop(
			Animated.sequence([
				Animated.timing(pulse, {
					toValue: 1.08,
					duration: 760,
					easing: Easing.out(Easing.ease),
					useNativeDriver: true,
				}),
				Animated.timing(pulse, {
					toValue: 0.985,
					duration: 760,
					easing: Easing.inOut(Easing.ease),
					useNativeDriver: true,
				}),
			])
		);

		spinLoop.start();
		pulseLoop.start();

		return () => {
			spinLoop.stop();
			pulseLoop.stop();
		};
	}, [spin, pulse]);

	const rotate = spin.interpolate({
		inputRange: [0, 1],
		outputRange: ["0deg", "360deg"],
	});

	return (
		<View style={styles.screen}>
			<View style={styles.bgOrbTop} />
			<View style={styles.bgOrbBottom} />

			<Animated.View style={[styles.logoWrap, { transform: [{ scale: pulse }] }]}>
				<Image
					source={require("@/assets/images/splash-fisiovet.png")}
					style={styles.logo}
					resizeMode="contain"
				/>
			</Animated.View>

			<Animated.View
				style={[
					styles.spinner,
					{
						transform: [{ rotate }],
					},
				]}
			>
				<View style={[styles.spinnerDot, styles.dot1]} />
				<View style={[styles.spinnerDot, styles.dot2]} />
				<View style={[styles.spinnerDot, styles.dot3]} />
				<View style={[styles.spinnerDot, styles.dot4]} />
				<View style={[styles.spinnerDot, styles.dot5]} />
				<View style={[styles.spinnerDot, styles.dot6]} />
				<View style={[styles.spinnerDot, styles.dot7]} />
				<View style={[styles.spinnerDot, styles.dot8]} />
			</Animated.View>

			<Text style={styles.loadingText}>Preparando seu ambiente</Text>
		</View>
	);
}

const styles = StyleSheet.create({
	screen: {
		flex: 1,
		backgroundColor: "#EAF6FA",
		alignItems: "center",
		justifyContent: "center",
		overflow: "hidden",
	},

	bgOrbTop: {
		position: "absolute",
		top: -120,
		right: -120,
		width: 300,
		height: 300,
		borderRadius: 150,
		backgroundColor: "rgba(10,132,255,0.10)",
	},

	bgOrbBottom: {
		position: "absolute",
		bottom: -160,
		left: -120,
		width: 360,
		height: 360,
		borderRadius: 180,
		backgroundColor: "rgba(27,196,181,0.13)",
	},

	logoWrap: {
		width: 315,
		height: 315,
		alignItems: "center",
		justifyContent: "center",
	},

	logo: {
		width: 300,
		height: 300,
	},

	spinner: {
		width: 36,
		height: 36,
		marginTop: 8,
		position: "relative",
	}, 
	
	spinnerDot: {
		position: "absolute",
		width: 6,
		height: 6,
		borderRadius: 3,
		backgroundColor: "#12B8B0",
		left: 15,
		top: 15,
	},

	dot1: { transform: [{ translateY: -15 }], opacity: 1 },
	dot2: { transform: [{ rotate: "45deg" }, { translateY: -15 }], opacity: 0.86 },
	dot3: { transform: [{ rotate: "90deg" }, { translateY: -15 }], opacity: 0.74 },
	dot4: { transform: [{ rotate: "135deg" }, { translateY: -15 }], opacity: 0.62 },
	dot5: { transform: [{ rotate: "180deg" }, { translateY: -15 }], opacity: 0.5 },
	dot6: { transform: [{ rotate: "225deg" }, { translateY: -15 }], opacity: 0.38 },
	dot7: { transform: [{ rotate: "270deg" }, { translateY: -15 }], opacity: 0.28 },
	dot8: { transform: [{ rotate: "315deg" }, { translateY: -15 }], opacity: 0.18 },

	loadingText: {
		marginTop: 12,
		fontSize: 12,
		fontWeight: "700",
		color: "rgba(15,23,42,0.48)",
		letterSpacing: 0.2,
	},
});