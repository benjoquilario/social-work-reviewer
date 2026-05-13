import { useEffect, useState } from "react"
import { Keyboard, Platform } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

export function useKeyboardInset() {
  const insets = useSafeAreaInsets()
  const [keyboardHeight, setKeyboardHeight] = useState(0)

  useEffect(() => {
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow"
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide"

    const showSubscription = Keyboard.addListener(showEvent, (event) => {
      const nextHeight = Math.max(
        0,
        event.endCoordinates.height - insets.bottom
      )
      setKeyboardHeight(nextHeight)
    })

    const hideSubscription = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0)
    })

    return () => {
      showSubscription.remove()
      hideSubscription.remove()
    }
  }, [insets.bottom])

  return keyboardHeight
}
