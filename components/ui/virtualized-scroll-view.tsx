import { type ReactNode } from "react"
import { ScrollView as RNScrollView, type ScrollViewProps } from "react-native"

type VirtualizedScrollViewProps = Omit<ScrollViewProps, "children"> & {
  children?: ReactNode
  className?: string
  contentContainerClassName?: string
}

export function ScrollView({
  children,
  className,
  contentContainerClassName,
  contentContainerStyle,
  style,
  ...rest
}: VirtualizedScrollViewProps) {
  return (
    <RNScrollView
      {...rest}
      className={className}
      style={style}
      contentContainerClassName={contentContainerClassName}
      contentContainerStyle={contentContainerStyle}
    >
      {children}
    </RNScrollView>
  )
}
