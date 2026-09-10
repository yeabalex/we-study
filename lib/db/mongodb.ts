import { MongoClient, Db } from 'mongodb';
import { CourseRoadmapDocument, TopicChatDocument, UserProgressDocument, UserStudyPreferences } from '@/types/we-study';

const uri = process.env.MONGODB_URI || '';
const options = {};

let client: MongoClient | null = null;
let clientPromise: Promise<MongoClient> | null = null;

// In-memory fallback database for local development when MongoDB is not connected
class MemoryDB {
  public users = new Map<string, any>();
  public subjects = new Map<string, any>();
  public courses = new Map<string, CourseRoadmapDocument>();
  public topicChats = new Map<string, TopicChatDocument>();
  public userProgress = new Map<string, UserProgressDocument>();

  constructor() {
    // Seed a default demo user for instant testing
    this.users.set('usr_demo_student', {
      _id: 'usr_demo_student',
      email: 'demo.student@westudy.app',
      name: 'Alex Rivera',
      image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      preferences: {
        learningStyle: 'active_practice_quizzes',
        primaryGoal: 'ace_exams',
        preferredPace: 'moderate',
        questionDensity: 'high',
        wantsFlashcards: true,
      },
      createdAt: new Date(),
    });
  }
}

declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
  var _memoryDB: MemoryDB | undefined;
}

export const memoryDB: MemoryDB = global._memoryDB || (global._memoryDB = new MemoryDB());

export async function getMongoClient(): Promise<MongoClient | null> {
  if (!uri) {
    return null;
  }

  if (process.env.NODE_ENV === 'development') {
    if (!global._mongoClientPromise) {
      client = new MongoClient(uri, options);
      global._mongoClientPromise = client.connect();
    }
    return global._mongoClientPromise;
  } else {
    if (!clientPromise) {
      client = new MongoClient(uri, options);
      clientPromise = client.connect();
    }
    return clientPromise;
  }
}

export async function getDb(): Promise<Db | null> {
  const mongoClient = await getMongoClient();
  if (!mongoClient) return null;
  return mongoClient.db();
}

/**
 * High-level Database Helper Methods (Abstracts MongoDB vs In-Memory Fallback)
 */
export const db = {
  async getUser(id: string) {
    const mongo = await getDb();
    if (mongo) {
      return mongo.collection('users').findOne({ _id: id as any });
    }
    return memoryDB.users.get(id) || null;
  },

  async getUserByEmail(email: string) {
    const mongo = await getDb();
    if (mongo) {
      return mongo.collection('users').findOne({ email });
    }
    for (const user of memoryDB.users.values()) {
      if (user.email === email) return user;
    }
    return null;
  },

  async upsertUser(user: { _id: string; email: string; name: string; image?: string; preferences?: Partial<UserStudyPreferences> }) {
    const mongo = await getDb();
    if (mongo) {
      const now = new Date();
      await mongo.collection('users').updateOne(
        { _id: user._id as any },
        {
          $set: {
            email: user.email,
            name: user.name,
            image: user.image,
            ...(user.preferences ? { preferences: user.preferences } : {}),
            updatedAt: now,
          },
          $setOnInsert: { createdAt: now },
        },
        { upsert: true }
      );
      return this.getUser(user._id);
    }

    const existing = memoryDB.users.get(user._id) || {};
    const updated = {
      ...existing,
      ...user,
      preferences: { ...(existing.preferences || {}), ...(user.preferences || {}) },
      updatedAt: new Date(),
      createdAt: existing.createdAt || new Date(),
    };
    memoryDB.users.set(user._id, updated);
    return updated;
  },

  async getSubjects(userId: string) {
    const mongo = await getDb();
    if (mongo) {
      return mongo.collection('subjects').find({ userId, status: 'ready' }).sort({ updatedAt: -1 }).toArray();
    }
    return Array.from(memoryDB.subjects.values())
      .filter((s) => s.userId === userId && s.status === 'ready')
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  },

  async getSubjectById(subjectId: string) {
    const mongo = await getDb();
    if (mongo) {
      return mongo.collection('subjects').findOne({ _id: subjectId as any });
    }
    return memoryDB.subjects.get(subjectId) || null;
  },

  async saveSubject(subject: any) {
    const mongo = await getDb();
    if (mongo) {
      await mongo.collection('subjects').updateOne(
        { _id: subject._id },
        { $set: subject },
        { upsert: true }
      );
      return subject;
    }
    memoryDB.subjects.set(subject._id, subject);
    return subject;
  },

  async deleteSubject(subjectId: string, userId: string) {
    const mongo = await getDb();
    if (mongo) {
      // Delete subject
      await mongo.collection('subjects').deleteOne({ _id: subjectId as any, userId });
      // Delete courses
      await mongo.collection('courses').deleteMany({ subjectId });
      // Delete user progress
      await mongo.collection('user_progress').deleteMany({ subjectId });
      // Delete topic chats
      await mongo.collection('topic_chats').deleteMany({ subjectId });
      return true;
    }

    memoryDB.subjects.delete(subjectId);
    for (const [id, c] of Array.from(memoryDB.courses.entries())) {
      if (c.subjectId === subjectId) memoryDB.courses.delete(id);
    }
    for (const [id, p] of Array.from(memoryDB.userProgress.entries())) {
      if (p.subjectId === subjectId) memoryDB.userProgress.delete(id);
    }
    for (const [k, ch] of Array.from(memoryDB.topicChats.entries())) {
      if (ch.subjectId === subjectId) memoryDB.topicChats.delete(k);
    }
    return true;
  },

  async getCourse(courseId: string): Promise<CourseRoadmapDocument | null> {
    const mongo = await getDb();
    if (mongo) {
      return mongo.collection<CourseRoadmapDocument>('courses').findOne({ _id: courseId }) as any;
    }
    return memoryDB.courses.get(courseId) || null;
  },

  async getCourseBySubject(subjectId: string): Promise<CourseRoadmapDocument | null> {
    const mongo = await getDb();
    if (mongo) {
      return mongo.collection<CourseRoadmapDocument>('courses').findOne({ subjectId }) as any;
    }
    for (const course of memoryDB.courses.values()) {
      if (course.subjectId === subjectId) return course;
    }
    return null;
  },

  async saveCourse(course: CourseRoadmapDocument) {
    const mongo = await getDb();
    if (mongo) {
      await mongo.collection('courses').updateOne(
        { _id: course._id as any },
        { $set: course },
        { upsert: true }
      );
      return course;
    }
    memoryDB.courses.set(course._id, course);
    return course;
  },

  async getTopicChat(subjectId: string, lessonId: string): Promise<TopicChatDocument | null> {
    const mongo = await getDb();
    if (mongo) {
      return mongo.collection<TopicChatDocument>('topic_chats').findOne({ subjectId, lessonId }) as any;
    }
    const key = `${subjectId}:${lessonId}`;
    return memoryDB.topicChats.get(key) || null;
  },

  async saveTopicChatMessage(subjectId: string, moduleId: string, lessonId: string, rangeId: string, userId: string, message: { role: 'user' | 'assistant'; content: string }) {
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newMsg = { messageId, role: message.role, content: message.content, timestamp: new Date() };

    const mongo = await getDb();
    if (mongo) {
      await mongo.collection('topic_chats').updateOne(
        { subjectId, lessonId },
        {
          $setOnInsert: {
            _id: `chat_${subjectId}_${lessonId}`,
            subjectId,
            moduleId,
            lessonId,
            rangeId,
            userId,
            createdAt: new Date(),
          },
          $push: { messages: newMsg as any },
          $set: { updatedAt: new Date() },
        },
        { upsert: true }
      );
      return newMsg;
    }

    const key = `${subjectId}:${lessonId}`;
    let chat = memoryDB.topicChats.get(key);
    if (!chat) {
      chat = {
        _id: `chat_${subjectId}_${lessonId}`,
        subjectId,
        moduleId,
        lessonId,
        rangeId,
        userId,
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      memoryDB.topicChats.set(key, chat);
    }
    chat.messages.push(newMsg);
    chat.updatedAt = new Date();
    return newMsg;
  },

  async getUserProgress(userId: string, subjectId: string): Promise<UserProgressDocument | null> {
    const mongo = await getDb();
    if (mongo) {
      return mongo.collection<UserProgressDocument>('user_progress').findOne({ userId, subjectId }) as any;
    }
    const key = `${userId}:${subjectId}`;
    return memoryDB.userProgress.get(key) || null;
  },

  async recordQuizAttempt(userId: string, subjectId: string, lessonId: string, attempt: { answers: any[]; score: number; maxScore: number }) {
    const now = new Date();
    const quizAttempt = { ...attempt, lessonId, completedAt: now };

    const mongo = await getDb();
    if (mongo) {
      await mongo.collection('user_progress').updateOne(
        { userId, subjectId },
        {
          $addToSet: { completedLessonIds: lessonId as any },
          $set: {
            [`quizAttempts.${lessonId}`]: quizAttempt,
            lastAccessedLessonId: lessonId,
            updatedAt: now,
          },
          $setOnInsert: {
            _id: `prog_${userId}_${subjectId}`,
            userId,
            subjectId,
            overallScorePercentage: 0,
            completedLessonIds: [lessonId],
          },
        },
        { upsert: true }
      );
      return quizAttempt;
    }

    const key = `${userId}:${subjectId}`;
    let prog = memoryDB.userProgress.get(key);
    if (!prog) {
      prog = {
        _id: `prog_${userId}_${subjectId}`,
        userId,
        subjectId,
        completedLessonIds: [],
        quizAttempts: {},
        overallScorePercentage: 0,
        updatedAt: now,
      };
      memoryDB.userProgress.set(key, prog);
    }
    if (!prog.completedLessonIds.includes(lessonId)) {
      prog.completedLessonIds.push(lessonId);
    }
    prog.quizAttempts[lessonId] = quizAttempt;
    prog.lastAccessedLessonId = lessonId;
    prog.updatedAt = now;
    return quizAttempt;
  },
};
