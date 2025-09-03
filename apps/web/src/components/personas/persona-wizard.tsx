'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Slider } from '@/components/ui/slider'

interface ToneSliders {
  formal: number
  enthusiastic: number
  conversational: number
  authoritative: number
  humorous: number
  empathetic: number
}

interface PersonaData {
  name: string
  description: string
  toneSliders: ToneSliders
  doList: string
  dontList: string
  sampleText: string
  isDefault: boolean
}

interface PersonaWizardProps {
  onComplete: (persona: PersonaData) => void
  onCancel: () => void
  initialData?: Partial<PersonaData>
}

const PRESET_PERSONAS = [
  {
    name: 'Inspirational Leader',
    description: 'Motivational and uplifting, perfect for keynotes and team meetings',
    toneSliders: { formal: 60, enthusiastic: 85, conversational: 40, authoritative: 75, humorous: 30, empathetic: 80 },
    doList: 'Use powerful metaphors, Tell compelling stories, Include clear call-to-action, Connect with audience emotions',
    dontList: 'Avoid jargon or technical terms, Don\'t be overly casual, Avoid controversial topics',
  },
  {
    name: 'Witty MC',
    description: 'Light-hearted and entertaining, great for events and celebrations',
    toneSliders: { formal: 20, enthusiastic: 70, conversational: 90, authoritative: 30, humorous: 95, empathetic: 60 },
    doList: 'Use humor and wordplay, Keep energy high, Include audience interaction, Use timing for comedic effect',
    dontList: 'Avoid offensive jokes, Don\'t dominate the spotlight, Avoid lengthy serious segments',
  },
  {
    name: 'Corporate Executive',
    description: 'Professional and authoritative, ideal for business presentations',
    toneSliders: { formal: 85, enthusiastic: 40, conversational: 25, authoritative: 90, humorous: 15, empathetic: 50 },
    doList: 'Use data and facts, Speak with confidence, Include strategic insights, Reference industry expertise',
    dontList: 'Avoid overly casual language, Don\'t use unverified claims, Avoid personal anecdotes',
  },
]

export function PersonaWizard({ onComplete, onCancel, initialData }: PersonaWizardProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [personaData, setPersonaData] = useState<PersonaData>({
    name: '',
    description: '',
    toneSliders: {
      formal: 50,
      enthusiastic: 50,
      conversational: 50,
      authoritative: 50,
      humorous: 50,
      empathetic: 50,
    },
    doList: '',
    dontList: '',
    sampleText: '',
    isDefault: false,
    ...initialData,
  })

  const steps = [
    { id: 'basics', title: 'Basics', description: 'Name and description' },
    { id: 'tone', title: 'Tone', description: 'Set your speaking style' },
    { id: 'preferences', title: 'Preferences', description: 'Do\'s and don\'ts' },
    { id: 'sample', title: 'Sample', description: 'Provide a writing sample' },
    { id: 'review', title: 'Review', description: 'Final review' },
  ]

  const progress = ((currentStep + 1) / steps.length) * 100

  const handleSliderChange = (key: keyof ToneSliders, value: number[]) => {
    setPersonaData(prev => ({
      ...prev,
      toneSliders: {
        ...prev.toneSliders,
        [key]: value[0],
      },
    }))
  }

  const loadPreset = (preset: typeof PRESET_PERSONAS[0]) => {
    setPersonaData(prev => ({
      ...prev,
      name: preset.name,
      description: preset.description,
      toneSliders: preset.toneSliders,
      doList: preset.doList,
      dontList: preset.dontList,
    }))
  }

  const canProceed = () => {
    switch (currentStep) {
      case 0:
        return personaData.name.trim().length > 0
      case 1:
        return true // Tone sliders always have values
      case 2:
        return true // Preferences are optional
      case 3:
        return true // Sample text is optional
      case 4:
        return true // Review step
      default:
        return false
    }
  }

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      onComplete(personaData)
    }
  }

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Choose a Preset or Start Fresh</h3>
              <div className="grid gap-4 md:grid-cols-3">
                {PRESET_PERSONAS.map((preset) => (
                  <Card
                    key={preset.name}
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => loadPreset(preset)}
                  >
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">{preset.name}</CardTitle>
                      <CardDescription className="text-sm">
                        {preset.description}
                      </CardDescription>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Persona Name *</Label>
                <Input
                  id="name"
                  value={personaData.name}
                  onChange={(e) => setPersonaData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., My Executive Style"
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={personaData.description}
                  onChange={(e) => setPersonaData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe when and how you'd use this speaking style..."
                  rows={3}
                />
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isDefault"
                  checked={personaData.isDefault}
                  onChange={(e) => setPersonaData(prev => ({ ...prev, isDefault: e.target.checked }))}
                />
                <Label htmlFor="isDefault">Make this my default persona</Label>
              </div>
            </div>
          </div>
        )

      case 1:
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">Set Your Speaking Tone</h3>
            <div className="space-y-6">
              {Object.entries(personaData.toneSliders).map(([key, value]) => (
                <div key={key} className="space-y-2">
                  <div className="flex justify-between">
                    <Label className="capitalize">{key.replace(/([A-Z])/g, ' $1').toLowerCase()}</Label>
                    <Badge variant="outline">{value}%</Badge>
                  </div>
                  <Slider
                    value={[value]}
                    onValueChange={(values) => handleSliderChange(key as keyof ToneSliders, values)}
                    max={100}
                    step={5}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>{getToneLabel(key, 'low')}</span>
                    <span>{getToneLabel(key, 'high')}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )

      case 2:
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">Speaking Preferences</h3>
            <div className="space-y-4">
              <div>
                <Label htmlFor="doList">Things you should do</Label>
                <Textarea
                  id="doList"
                  value={personaData.doList}
                  onChange={(e) => setPersonaData(prev => ({ ...prev, doList: e.target.value }))}
                  placeholder="e.g., Use personal stories, Speak with confidence, Include clear takeaways..."
                  rows={4}
                />
                <p className="text-sm text-gray-500 mt-1">
                  List elements that should be included in your speeches (one per line)
                </p>
              </div>
              <div>
                <Label htmlFor="dontList">Things to avoid</Label>
                <Textarea
                  id="dontList"
                  value={personaData.dontList}
                  onChange={(e) => setPersonaData(prev => ({ ...prev, dontList: e.target.value }))}
                  placeholder="e.g., Don't use jargon, Avoid controversial topics, Don't speak too fast..."
                  rows={4}
                />
                <p className="text-sm text-gray-500 mt-1">
                  List things that should be avoided in your speeches (one per line)
                </p>
              </div>
            </div>
          </div>
        )

      case 3:
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">Writing Sample (Optional)</h3>
            <div className="space-y-4">
              <div>
                <Label htmlFor="sampleText">Paste a sample of your writing</Label>
                <Textarea
                  id="sampleText"
                  value={personaData.sampleText}
                  onChange={(e) => setPersonaData(prev => ({ ...prev, sampleText: e.target.value }))}
                  placeholder="Paste a few paragraphs of your writing that represents your desired style. This could be from emails, previous speeches, or any writing that captures your voice..."
                  rows={8}
                />
                <p className="text-sm text-gray-500 mt-1">
                  Providing a sample helps us analyze your unique writing style and create better matches.
                </p>
              </div>
            </div>
          </div>
        )

      case 4:
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">Review Your Persona</h3>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium">Basic Information</h4>
                <p className="text-sm text-gray-600">
                  <strong>Name:</strong> {personaData.name}
                </p>
                {personaData.description && (
                  <p className="text-sm text-gray-600">
                    <strong>Description:</strong> {personaData.description}
                  </p>
                )}
                {personaData.isDefault && (
                  <Badge variant="secondary">Default Persona</Badge>
                )}
              </div>
              
              <div>
                <h4 className="font-medium">Tone Profile</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {Object.entries(personaData.toneSliders).map(([key, value]) => (
                    <div key={key} className="flex justify-between">
                      <span className="capitalize">{key}:</span>
                      <span>{value}%</span>
                    </div>
                  ))}
                </div>
              </div>

              {(personaData.doList || personaData.dontList) && (
                <div>
                  <h4 className="font-medium">Preferences</h4>
                  {personaData.doList && (
                    <div className="text-sm">
                      <strong>Do:</strong> {personaData.doList.substring(0, 100)}
                      {personaData.doList.length > 100 && '...'}
                    </div>
                  )}
                  {personaData.dontList && (
                    <div className="text-sm">
                      <strong>Don't:</strong> {personaData.dontList.substring(0, 100)}
                      {personaData.dontList.length > 100 && '...'}
                    </div>
                  )}
                </div>
              )}

              {personaData.sampleText && (
                <div>
                  <h4 className="font-medium">Writing Sample</h4>
                  <p className="text-sm text-gray-600">
                    Sample provided ({personaData.sampleText.length} characters)
                  </p>
                </div>
              )}
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-2">Create New Persona</h2>
        <Progress value={progress} className="mb-4" />
        <div className="flex justify-between text-sm text-gray-500">
          {steps.map((step, index) => (
            <span
              key={step.id}
              className={index === currentStep ? 'font-medium text-gray-900' : ''}
            >
              {step.title}
            </span>
          ))}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{steps[currentStep].title}</CardTitle>
          <CardDescription>{steps[currentStep].description}</CardDescription>
        </CardHeader>
        <CardContent>
          {renderStepContent()}
          
          <div className="flex justify-between mt-8">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStep === 0}
            >
              Previous
            </Button>
            
            <div className="space-x-2">
              <Button variant="outline" onClick={onCancel}>
                Cancel
              </Button>
              <Button
                onClick={handleNext}
                disabled={!canProceed()}
              >
                {currentStep === steps.length - 1 ? 'Create Persona' : 'Next'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function getToneLabel(key: string, level: 'low' | 'high'): string {
  const labels: Record<string, { low: string; high: string }> = {
    formal: { low: 'Casual', high: 'Formal' },
    enthusiastic: { low: 'Calm', high: 'Enthusiastic' },
    conversational: { low: 'Direct', high: 'Conversational' },
    authoritative: { low: 'Humble', high: 'Authoritative' },
    humorous: { low: 'Serious', high: 'Humorous' },
    empathetic: { low: 'Objective', high: 'Empathetic' },
  }
  
  return labels[key]?.[level] || (level === 'low' ? 'Low' : 'High')
}