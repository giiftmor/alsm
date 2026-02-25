import * as React from "react"
import { cn } from "@/lib/utils"

const TabsContext = React.createContext(null)

const Tabs = React.forwardRef(({ className, defaultValue, children, ...props }, ref) => {
  const [value, setValue] = React.useState(defaultValue || "")
  
  return (
    <TabsContext.Provider value={{ value, setValue }}>
      <div ref={ref} className={cn("w-full", className)} {...props}>
        {children}
      </div>
    </TabsContext.Provider>
  )
})
Tabs.displayName = "Tabs"

const TabsList = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground",
      className
    )}
    {...props}
  />
))
TabsList.displayName = "TabsList"

const TabsTrigger = React.forwardRef(({ className, value: triggerValue, ...props }, ref) => {
  const { value, setValue } = React.useContext(TabsContext)
  const isActive = value === triggerValue
  
  return (
    <button
      ref={ref}
      type="button"
      onClick={() => setValue(triggerValue)}
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
        isActive 
          ? "bg-background text-foreground shadow-sm" 
          : "text-muted-foreground hover:text-foreground",
        className
      )}
      {...props}
    />
  )
})
TabsTrigger.displayName = "TabsTrigger"

const TabsContent = React.forwardRef(({ className, value: contentValue, ...props }, ref) => {
  const { value } = React.useContext(TabsContext)
  
  if (value !== contentValue) return null
  
  return (
    <div
      ref={ref}
      className={cn(
        "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        className
      )}
      {...props}
    />
  )
})
TabsContent.displayName = "TabsContent"

export { Tabs, TabsList, TabsTrigger, TabsContent }
