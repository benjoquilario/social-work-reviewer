import { View } from "react-native"

import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export function CommunityLoading() {
  return (
    <View className="gap-4">
      <Card className="overflow-hidden rounded-[30px] py-0">
        <CardContent className="gap-4 px-4 py-4">
          <View className="flex-row items-center gap-3">
            <Skeleton className="h-12 w-12 rounded-[20px]" />
            <View className="flex-1 gap-2">
              <Skeleton className="h-4 w-40 rounded-full" />
              <Skeleton className="h-3 w-24 rounded-full" />
            </View>
          </View>
          <Skeleton className="h-6 w-2/3 rounded-full" />
          <Skeleton className="h-4 w-full rounded-full" />
          <Skeleton className="h-4 w-5/6 rounded-full" />
          <Skeleton className="h-52 rounded-[24px]" />
          <View className="flex-row gap-2">
            <Skeleton className="h-11 flex-1 rounded-2xl" />
            <Skeleton className="h-11 flex-1 rounded-2xl" />
            <Skeleton className="h-11 flex-1 rounded-2xl" />
          </View>
        </CardContent>
      </Card>

      <Card className="overflow-hidden rounded-[30px] py-0">
        <CardContent className="gap-4 px-4 py-4">
          <View className="flex-row items-center gap-3">
            <Skeleton className="h-12 w-12 rounded-[20px]" />
            <View className="flex-1 gap-2">
              <Skeleton className="h-4 w-36 rounded-full" />
              <Skeleton className="h-3 w-28 rounded-full" />
            </View>
          </View>
          <Skeleton className="h-6 w-3/4 rounded-full" />
          <Skeleton className="h-4 w-full rounded-full" />
          <Skeleton className="h-4 w-4/5 rounded-full" />
          <View className="rounded-[22px] border border-border bg-background px-4 py-3">
            <Skeleton className="h-4 w-1/4 rounded-full" />
            <Skeleton className="mt-3 h-4 w-1/2 rounded-full" />
          </View>
          <View className="flex-row gap-2">
            <Skeleton className="h-11 flex-1 rounded-2xl" />
            <Skeleton className="h-11 flex-1 rounded-2xl" />
            <Skeleton className="h-11 flex-1 rounded-2xl" />
          </View>
        </CardContent>
      </Card>
    </View>
  )
}
