import { getDb, sql } from './connection';
import * as schema from './schema';
import { eq } from 'drizzle-orm';

/**
 * Seed development data including demo persona, story snippets, and sample speech
 */
export async function seedDatabase() {
  console.log('🌱 Starting database seeding...');
  
  const db = getDb();
  
  try {
    // Create demo user
    const [demoUser] = await db.insert(schema.users).values({
      id: '550e8400-e29b-41d4-a716-446655440000', // Fixed UUID for consistency
      email: 'demo@speechwriter.ai',
      name: 'Demo User',
      emailVerified: new Date(),
    }).returning();
    
    console.log('✅ Created demo user');
    
    // Create subscription for demo user (Pro plan for full features)
    await db.insert(schema.subscriptions).values({
      userId: demoUser.id,
      status: 'active',
      plan: 'pro',
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    });
    
    // Create system story tags
    const storyTagsData = [
      { name: 'personal', description: 'Personal anecdotes and life experiences', color: '#3B82F6' },
      { name: 'professional', description: 'Work-related stories and achievements', color: '#059669' },
      { name: 'inspirational', description: 'Motivational and uplifting stories', color: '#DC2626' },
      { name: 'humorous', description: 'Funny stories and light moments', color: '#7C2D12' },
      { name: 'emotional', description: 'Stories with deep emotional impact', color: '#7C3AED' },
      { name: 'technical', description: 'Technical achievements and innovations', color: '#059669' },
      { name: 'sensitive', description: 'Stories requiring careful handling', color: '#DC2626' },
    ];
    
    const insertedTags = await db.insert(schema.storyTags).values(
      storyTagsData.map(tag => ({ ...tag, isSystemTag: true })) as any
    ).returning();
    
    console.log('✅ Created system story tags');
    
    // Create demo personas
    const demoPersonas = [
      {
        userId: demoUser.id,
        name: 'Inspirational Leader',
        description: 'Confident, motivating, and authoritative speaking style',
        toneSliders: JSON.stringify({
          confidence: 90,
          warmth: 75,
          authority: 85,
          humor: 60,
          passion: 80
        }),
        doList: 'Use strong action verbs, Include personal anecdotes, Reference specific achievements, Use metaphors from nature and sports',
        dontList: `Avoid hedge words (maybe, perhaps), Don't use passive voice, Avoid complex jargon, Don't end statements with questions`,
        sampleText: `We stand at the precipice of greatness. Every challenge we've faced has forged us into the leaders we are today. Like a river carving through rock, persistence creates pathways where none existed before.`,
        isDefault: true,
        isPreset: true,
      },
      {
        userId: demoUser.id,
        name: 'Witty MC',
        description: 'Light-hearted, engaging, and conversational style',
        toneSliders: JSON.stringify({
          confidence: 80,
          warmth: 90,
          authority: 70,
          humor: 95,
          passion: 75
        }),
        doList: 'Use conversational language, Include appropriate humor, Create connection with audience, Use timing and pauses effectively',
        dontList: `Avoid controversial jokes, Don't be overly formal, Avoid long monologues, Don't ignore audience energy`,
        sampleText: `You know, they say public speaking is people's number one fear. Death is number two. That means at a funeral, most people would rather be in the coffin than giving the eulogy!`,
        isPreset: true,
      },
      {
        userId: demoUser.id,
        name: 'Technical Expert',
        description: 'Clear, precise, and informative speaking style',
        toneSliders: JSON.stringify({
          confidence: 85,
          warmth: 65,
          authority: 90,
          humor: 40,
          passion: 70
        }),
        doList: 'Use precise terminology, Provide concrete examples, Structure information clearly, Reference credible sources',
        dontList: `Avoid unnecessary complexity, Don't assume prior knowledge, Avoid filler words, Don't rush through explanations`,
        sampleText: 'The implementation follows a three-tier architecture. First, the presentation layer handles user interactions. Second, the business logic layer processes requests. Finally, the data layer manages persistence.',
        isPreset: true,
      }
    ];
    
    const insertedPersonas = await db.insert(schema.personas).values(demoPersonas).returning();
    console.log('✅ Created demo personas');
    
    // Create style cards for personas (simplified for demo)
    for (const persona of insertedPersonas) {
      await db.insert(schema.styleCards).values({
        personaId: persona.id,
        avgSentenceLength: persona.name === 'Technical Expert' ? 18.5 : 
                          persona.name === 'Witty MC' ? 12.3 : 15.8,
        vocabularyComplexity: persona.name === 'Technical Expert' ? 0.8 : 
                             persona.name === 'Witty MC' ? 0.4 : 0.6,
        rhetoricalDevices: JSON.stringify(['metaphor', 'repetition', 'alliteration']),
        isProcessed: true,
      });
    }
    
    console.log('✅ Created style cards');
    
    // Create demo stories
    const demoStories = [
      {
        userId: demoUser.id,
        title: 'The Lighthouse Keeper',
        content: 'During my first year as CEO, we faced our biggest challenge yet. Like a lighthouse keeper during a storm, I had to remain steady while everything around us was chaos. The waves of market uncertainty crashed against us, but we kept our beacon shining. That steady light guided our team through the darkness, and when dawn broke, we found ourselves stronger than ever.',
        summary: 'A metaphorical story about leadership during crisis using lighthouse imagery',
        theme: 'Leadership resilience',
        emotion: 'Determined',
        audienceType: 'corporate',
        sensitivityLevel: 'low',
        tags: 'professional,inspirational',
        context: 'Opening story for leadership talks, crisis management presentations',
      },
      {
        userId: demoUser.id,
        title: 'The Coffee Shop Revelation',
        content: `I was sitting in a small coffee shop, struggling with a complex problem. A seven-year-old at the next table was building with blocks, and when they fell, she didn't get upset. She just said, "That's how I learn what doesn't work." In that moment, I realized failure isn't the opposite of success—it's the foundation of it.`,
        summary: `A personal story about learning from failure through a child's perspective`,
        theme: 'Learning from failure',
        emotion: 'Insightful',
        audienceType: 'general',
        sensitivityLevel: 'low',
        tags: 'personal,inspirational',
        context: 'Failure recovery, innovation talks, educational presentations',
      },
      {
        userId: demoUser.id,
        title: 'The Standing Ovation',
        content: 'After months of preparation, I delivered what I thought was a perfect presentation. No applause. Dead silence. Then someone in the back row stood up—not to clap, but to ask a question that completely changed our product roadmap. Sometimes the most valuable feedback comes wrapped in unexpected packages.',
        summary: 'A professional story about unexpected feedback and product pivots',
        theme: 'Embracing feedback',
        emotion: 'Reflective',
        audienceType: 'corporate',
        sensitivityLevel: 'low',
        tags: 'professional,humorous',
        context: 'Product development talks, feedback culture presentations',
      },
    ];
    
    const insertedStories = await db.insert(schema.stories).values(demoStories).returning();
    console.log('✅ Created demo stories');
    
    // Create story-tag relationships
    for (let i = 0; i < insertedStories.length; i++) {
      const story = insertedStories[i];
      const storyTags = demoStories[i].tags.split(',');
      
      for (const tagName of storyTags) {
        const tag = insertedTags.find(t => t.name === tagName.trim());
        if (tag) {
          await db.insert(schema.storyTagRelations).values({
            storyId: story.id,
            tagId: tag.id,
          });
        }
      }
    }
    
    // Create demo embeddings (placeholder - in real app these would be generated by AI)
    for (const story of insertedStories) {
      await db.insert(schema.storyEmbeddings).values({
        storyId: story.id,
        embedding: JSON.stringify(Array.from({ length: 1536 }, () => Math.random() - 0.5)),
        model: 'text-embedding-ada-002',
      });
    }
    
    console.log('✅ Created story embeddings');
    
    // Create sample speech: "6-minute keynote"
    const [sampleSpeech] = await db.insert(schema.speeches).values({
      userId: demoUser.id,
      title: 'The Future is Built by Those Who Dare to Begin',
      occasion: 'Tech conference keynote',
      audience: 'Software engineers and tech leaders, 500+ attendees',
      targetDurationMinutes: 6,
      constraints: JSON.stringify({
        mustInclude: ['call to action', 'personal story', 'industry statistics'],
        avoid: ['political topics', 'competitor bashing'],
        tone: 'inspirational but grounded'
      }),
      thesis: 'Innovation happens when we stop waiting for perfect conditions and start building with what we have',
      status: 'completed',
      metadata: JSON.stringify({
        createdBy: 'demo-seed',
        speechType: 'keynote',
        industry: 'technology'
      }),
    }).returning();
    
    console.log('✅ Created sample speech');
    
    // Create speech sections (outline)
    const speechSections = [
      {
        speechId: sampleSpeech.id,
        title: 'Opening Hook',
        content: `Imagine if every great innovation started with perfect conditions. We'd still be waiting for the first computer. Steve Jobs and Steve Wozniak didn't have a corporate headquarters—they had a garage. Facebook wasn't launched from a Silicon Valley office—it started in a Harvard dorm room.`,
        orderIndex: 1,
        allocatedTimeMinutes: 1,
        actualTimeMinutes: 1,
        sectionType: 'opening',
        notes: 'Strong opening with relatable examples, sets up the main theme',
      },
      {
        speechId: sampleSpeech.id,
        title: 'The Problem',
        content: `Yet today, I see brilliant engineers paralyzed by perfectionism. "We need more data." "The market isn't ready." "Let's wait for the next framework." While we're waiting, problems remain unsolved and opportunities slip away.`,
        orderIndex: 2,
        allocatedTimeMinutes: 1,
        actualTimeMinutes: 1,
        sectionType: 'problem',
        notes: 'Identifies the core issue - paralysis by analysis',
      },
      {
        speechId: sampleSpeech.id,
        title: 'Personal Story',
        content: `Three years ago, I was that engineer. I had an idea for a developer tool but kept finding reasons to delay. "The competition is too strong." "I need six more months." Then I met Sarah, a 16-year-old who built her first app with nothing but free tutorials and sheer determination. Her app now has 100,000 users. She didn't wait for permission—she just began.`,
        orderIndex: 3,
        allocatedTimeMinutes: 1.5,
        actualTimeMinutes: 1.5,
        sectionType: 'story',
        notes: 'Personal vulnerability + inspiring example from younger generation',
      },
      {
        speechId: sampleSpeech.id,
        title: 'The Solution Framework',
        content: `Here's what I've learned: The future belongs to builders, not planners. Start with one user, not a million. Ship version 0.1, not version perfect. Every line of code you write teaches you something no planning session ever could.`,
        orderIndex: 4,
        allocatedTimeMinutes: 1,
        actualTimeMinutes: 1,
        sectionType: 'solution',
        notes: 'Practical framework with memorable phrases',
      },
      {
        speechId: sampleSpeech.id,
        title: 'Call to Action',
        content: `So here's my challenge to you: Before you leave this conference, identify one project you've been postponing. Not your biggest idea—your simplest one. Give yourself 30 days to build a basic version. Don't aim for perfection—aim for done.`,
        orderIndex: 5,
        allocatedTimeMinutes: 1,
        actualTimeMinutes: 1,
        sectionType: 'action',
        notes: 'Specific, actionable challenge with clear timeframe',
      },
      {
        speechId: sampleSpeech.id,
        title: 'Closing',
        content: `Remember: Every expert was once a beginner. Every revolutionary product was once just an idea. The only difference between dreamers and builders is that builders start before they're ready. The future is built by those who dare to begin. Your time is now.`,
        orderIndex: 6,
        allocatedTimeMinutes: 0.5,
        actualTimeMinutes: 0.5,
        sectionType: 'close',
        notes: 'Callback to opening theme, memorable ending line',
      }
    ];
    
    await db.insert(schema.speechSections).values(speechSections);
    console.log('✅ Created speech outline');
    
    // Create initial version of the speech
    const fullText = speechSections.map(section => section.content).join('\n\n');
    const [initialVersion] = await db.insert(schema.speechVersions).values({
      speechId: sampleSpeech.id,
      versionNumber: 1,
      label: 'Initial Draft',
      fullText,
      outline: JSON.stringify(speechSections.map(s => ({
        title: s.title,
        duration: s.allocatedTimeMinutes
      }))),
      wordCount: fullText.split(' ').length,
      estimatedDurationMinutes: 6,
      isAutomatic: false,
    }).returning();
    
    // Update speech to reference current version
    await db.update(schema.speeches)
      .set({ currentVersionId: initialVersion.id })
      .where(eq(schema.speeches.id, sampleSpeech.id));
    
    console.log('✅ Created speech version');
    
    // Create some demo analytics
    await db.insert(schema.speechAnalytics).values({
      speechId: sampleSpeech.id,
      userId: demoUser.id,
      draftCreatedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      firstEditAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
      finalizedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      timeToFirstDraft: 3600, // 1 hour
      timeToFinal: 6 * 24 * 3600, // 6 days
      editBurden: 12,
      humanizationPasses: 3,
      finalWordCount: fullText.split(' ').length,
      targetWordCount: 900, // ~6 minutes at 150 WPM
      accuracyScore: 0.95,
      qualityScore: 0.88,
      userSatisfaction: 5,
    });
    
    console.log('✅ Created speech analytics');
    
    console.log('🌱✅ Database seeding completed successfully!');
    console.log('');
    console.log('📋 Seeded data includes:');
    console.log('  • Demo user with Pro subscription');
    console.log('  • 3 persona presets (Inspirational Leader, Witty MC, Technical Expert)');
    console.log('  • 3 demo stories with embeddings and tags');
    console.log('  • Sample 6-minute keynote speech with full outline');
    console.log('  • Analytics and version tracking');
    console.log('');
    console.log('🚀 Ready for end-to-end demo: outline → draft → export');
    
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    throw error;
  }
}

// Run seeding if this file is executed directly
if (require.main === module) {
  seedDatabase()
    .then(() => {
      console.log('✅ Seeding completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Seeding failed:', error);
      process.exit(1);
    });
}