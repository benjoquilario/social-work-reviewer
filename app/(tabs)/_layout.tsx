import React, { useCallback } from "react"
import { Tabs, useRouter } from "expo-router"

import { StudyTabBar } from "@/components/navigation/StudyTabBar"

export default function TabLayout() {
  const router = useRouter()

  // The centre button starts a session rather than switching section, so it
  // pushes onto the root stack instead of emitting a tabPress.
  const handlePressStudy = useCallback(() => {
    router.push("/mode")
  }, [router])

  return (
    <Tabs
      tabBar={(props) => (
        <StudyTabBar {...props} onPressStudy={handlePressStudy} />
      )}
      screenOptions={{
        headerShown: false,
        lazy: true,
        freezeOnBlur: true,
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Home" }} />
      <Tabs.Screen name="learn" options={{ title: "Learn" }} />
      <Tabs.Screen name="community" options={{ title: "Forum" }} />
      <Tabs.Screen name="profile" options={{ title: "Profile" }} />

      {/*
        Updates keeps its route but leaves the bar: `href: null` removes the
        tab without unregistering the screen, so the Home bell can still push
        to it and any deep link into /news keeps working.
      */}
      <Tabs.Screen name="news" options={{ title: "Updates", href: null }} />
    </Tabs>
  )
}
