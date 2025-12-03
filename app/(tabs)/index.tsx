import { useState, useRef, useEffect } from 'react'
import {
  StyleSheet,
  Text,
  View,
  Button,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
  Vibration,
} from 'react-native'
import { CameraView, useCameraPermissions } from 'expo-camera'
import { Ionicons } from '@expo/vector-icons'
import axios from 'axios'

export default function App() {
  const [permission, requestPermission] = useCameraPermissions()
  const [scanned, setScanned] = useState(false)
  const [loading, setLoading] = useState(false)
  const [flash, setFlash] = useState('off') // 'off' | 'on'

  // 서버 주소 (본인 PC IP와 포트번호 5000 확인 필수)
  const SERVER_URL = 'http://192.168.50.98:5000/api/save-qr'

  // 중복 스캔 방지를 위한 Ref
  const isProcessing = useRef(false)

  if (!permission) {
    return <View style={styles.container} />
  }

  if (!permission.granted) {
    // 권한 허용 요청 화면
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionText}>카메라 사용 권한이 필요합니다</Text>
        <Button onPress={requestPermission} title="권한 허용하기" />
      </View>
    )
  }

  // QR 스캔 핸들러
  const handleBarCodeScanned = ({ data }) => {
    // 이미 처리 중이거나 스캔된 상태면 무시
    if (scanned || loading || isProcessing.current) return

    isProcessing.current = true
    setScanned(true)
    Vibration.vibrate() // 진동 피드백

    Alert.alert(
      '📦 QR 코드 인식됨',
      `데이터: ${data}\n서버로 전송하시겠습니까?`,
      [
        {
          text: '취소',
          onPress: () => {
            setScanned(false)
            isProcessing.current = false
          },
          style: 'cancel',
        },
        {
          text: '전송',
          onPress: () => sendDataToServer(data),
        },
      ],
      { cancelable: false }
    )
  }

  // 서버 전송 함수
  const sendDataToServer = async (qrData) => {
    setLoading(true)
    try {
      console.log(`Sending to: ${SERVER_URL}`)

      const response = await axios.post(SERVER_URL, {
        data: qrData,
      })

      if (response.status === 200) {
        const productName = response.data.result?.productName || '상품'
        Alert.alert('✅ 성공', `저장 완료!\n(${productName})`, [
          {
            text: '확인',
            onPress: () => {
              setScanned(false)
              isProcessing.current = false
            },
          },
        ])
      }
    } catch (error) {
      console.error(error)
      Alert.alert(
        '❌ 실패',
        '서버에 연결할 수 없습니다.\nIP와 포트(5000)를 확인하세요.',
        [
          {
            text: '확인',
            onPress: () => {
              setScanned(false)
              isProcessing.current = false
            },
          },
        ]
      )
    } finally {
      setLoading(false)
    }
  }

  // 플래시 토글 함수
  const toggleFlash = () => {
    setFlash((current) => (current === 'off' ? 'on' : 'off'))
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing="back"
        enableTorch={flash === 'on'}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: ['qr'],
        }}
      />

      {/* 스캔 가이드라인 (Overlay) */}
      <View style={styles.overlay}>
        <View style={styles.unfocusedContainer}></View>
        <View style={styles.middleContainer}>
          <View style={styles.unfocusedContainer}></View>
          <View style={styles.focusedContainer}>
            {/* 모서리 표시 */}
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />
          </View>
          <View style={styles.unfocusedContainer}></View>
        </View>
        <View style={styles.unfocusedContainer}></View>
      </View>

      {/* 플래시 버튼 */}
      <TouchableOpacity style={styles.flashButton} onPress={toggleFlash}>
        <Ionicons
          name={flash === 'on' ? 'flash' : 'flash-off'}
          size={24}
          color="white"
        />
      </TouchableOpacity>

      {/* 로딩 인디케이터 */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#ffffff" />
          <Text style={styles.loadingText}>서버로 전송 중...</Text>
        </View>
      )}

      {/* 하단 안내 문구 */}
      <View style={styles.bottomMessage}>
        <Text style={styles.text}>QR 코드를 사각형 안에 맞춰주세요</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  permissionText: {
    marginBottom: 10,
    fontSize: 16,
  },
  // 오버레이 스타일 (가운데만 뚫려보이게)
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  unfocusedContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  middleContainer: {
    flexDirection: 'row',
    flex: 1.5,
  },
  focusedContainer: {
    flex: 5,
  },
  // 모서리 디자인
  corner: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderColor: '#00FF00',
    borderWidth: 3,
  },
  topLeft: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0 },
  topRight: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0 },
  bottomLeft: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0 },
  bottomRight: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0 },

  // 플래시 버튼
  flashButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 10,
    borderRadius: 25,
  },
  // 하단 메시지
  bottomMessage: {
    position: 'absolute',
    bottom: 50,
    width: '100%',
    alignItems: 'center',
  },
  text: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    overflow: 'hidden',
  },
  // 로딩 오버레이
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  loadingText: {
    color: 'white',
    marginTop: 10,
    fontSize: 16,
    fontWeight: 'bold',
  },
})
