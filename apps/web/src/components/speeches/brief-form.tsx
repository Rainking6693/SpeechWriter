'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, FileText, Users, Clock, Target, AlertCircle } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'

const briefSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be less than 200 characters'),
  occasion: z.string().min(1, 'Occasion is required').max(100, 'Occasion must be less than 100 characters'),
  audience: z.string().min(1, 'Audience description is required').max(500, 'Audience description must be less than 500 characters'),
  targetDurationMinutes: z.number().min(1, 'Duration must be at least 1 minute').max(120, 'Duration must be less than 120 minutes'),
  constraints: z.string().max(1000, 'Constraints must be less than 1000 characters').optional(),
  thesis: z.string().min(1, 'Main message is required').max(500, 'Main message must be less than 500 characters'),
})

type BriefFormData = z.infer<typeof briefSchema>

export function BriefForm() {
  const router = useRouter()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch
  } = useForm<BriefFormData>({
    resolver: zodResolver(briefSchema)
  })

  const watchedDuration = watch('targetDurationMinutes')

  const onSubmit = async (data: BriefFormData) => {
    setIsSubmitting(true)
    
    try {
      const response = await fetch('/api/speeches', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        throw new Error('Failed to create speech')
      }

      const speech = await response.json()
      
      toast({
        title: 'Speech brief created!',
        description: 'Your speech brief has been saved. Now let\'s create an outline.',
      })

      router.push(`/speeches/${speech.id}`)
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create speech brief. Please try again.',
        variant: 'destructive',
      })
      console.error('Error creating speech:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const getDurationFeedback = (minutes: number) => {
    if (!minutes) return null
    if (minutes <= 5) return { color: 'text-green-600', text: 'Short and focused' }
    if (minutes <= 15) return { color: 'text-blue-600', text: 'Standard length' }
    if (minutes <= 30) return { color: 'text-orange-600', text: 'Extended presentation' }
    return { color: 'text-red-600', text: 'Very long - consider breaking into segments' }
  }

  const durationFeedback = getDurationFeedback(watchedDuration)

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="text-center">
        <div className="flex items-center justify-center w-16 h-16 mx-auto bg-primary/10 rounded-full mb-4">
          <FileText className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold">Speech Brief</h2>
        <p className="text-gray-600 mt-2">
          Tell us about your speech so we can help you create something amazing
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Basic Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="title">Speech Title</Label>
              <Input
                id="title"
                placeholder="e.g., Keynote Address: Innovation in the Digital Age"
                {...register('title')}
                className={errors.title ? 'border-red-500' : ''}
              />
              {errors.title && (
                <p className="text-red-500 text-sm mt-1">{errors.title.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="occasion">Occasion</Label>
              <Input
                id="occasion"
                placeholder="e.g., Annual Tech Conference, Wedding Reception, Board Meeting"
                {...register('occasion')}
                className={errors.occasion ? 'border-red-500' : ''}
              />
              {errors.occasion && (
                <p className="text-red-500 text-sm mt-1">{errors.occasion.message}</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Audience & Context
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="audience">Audience Description</Label>
              <Textarea
                id="audience"
                rows={3}
                placeholder="e.g., 200 technology professionals, ages 25-50, mostly engineers and product managers. Mix of experience levels from junior to senior leadership."
                {...register('audience')}
                className={errors.audience ? 'border-red-500' : ''}
              />
              {errors.audience && (
                <p className="text-red-500 text-sm mt-1">{errors.audience.message}</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Timing & Constraints
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="targetDurationMinutes">Target Duration (minutes)</Label>
              <div className="flex items-center gap-4">
                <Input
                  id="targetDurationMinutes"
                  type="number"
                  min="1"
                  max="120"
                  placeholder="15"
                  {...register('targetDurationMinutes', { valueAsNumber: true })}
                  className={`max-w-32 ${errors.targetDurationMinutes ? 'border-red-500' : ''}`}
                />
                {durationFeedback && (
                  <span className={`text-sm ${durationFeedback.color}`}>
                    {durationFeedback.text}
                  </span>
                )}
              </div>
              {errors.targetDurationMinutes && (
                <p className="text-red-500 text-sm mt-1">{errors.targetDurationMinutes.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="constraints">Special Constraints or Requirements</Label>
              <Textarea
                id="constraints"
                rows={2}
                placeholder="e.g., Must include company values, avoid technical jargon, need time for Q&A, specific topics to cover"
                {...register('constraints')}
                className={errors.constraints ? 'border-red-500' : ''}
              />
              {errors.constraints && (
                <p className="text-red-500 text-sm mt-1">{errors.constraints.message}</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5" />
              Key Message
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div>
              <Label htmlFor="thesis">Main Message or Thesis</Label>
              <Textarea
                id="thesis"
                rows={3}
                placeholder="e.g., Technology should serve humanity, not replace it. By focusing on human-centered design, we can build tools that amplify our best qualities."
                {...register('thesis')}
                className={errors.thesis ? 'border-red-500' : ''}
              />
              <p className="text-sm text-gray-500 mt-1">
                What's the one key idea you want your audience to remember?
              </p>
              {errors.thesis && (
                <p className="text-red-500 text-sm mt-1">{errors.thesis.message}</p>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-between items-center pt-6 border-t">
          <Button type="button" variant="outline" onClick={() => router.push('/')}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Create Speech Brief
          </Button>
        </div>
      </form>
    </div>
  )
}