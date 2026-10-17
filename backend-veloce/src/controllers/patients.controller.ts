/**
 * @file Patients controller — `/api/patients/*`.
 *
 * EN: Clinical data for patients: medical history, follow-ups, conditions and
 *     documents. Reads are allowed to the patient themselves or any
 *     doctor/admin; writes are doctor/admin only. When editing a history entry
 *     or follow-up, a non-admin must be the authoring doctor.
 * ES: Datos clínicos del paciente: historial, seguimientos, condiciones y
 *     documentos. Las lecturas las permite el propio paciente o cualquier
 *     doctor/admin; las escrituras solo doctor/admin. Al editar una entrada de
 *     historial o seguimiento, un no-admin debe ser el doctor autor.
 */
import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Ctx,
  Roles,
  Inject,
  InjectDB,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  UseMiddleware,
} from 'veloce-ts';
import type { Context } from 'hono';
import { and, eq, gte, desc, asc } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import type { DrizzleDB } from '../db/client';
import {
  users,
  doctors,
  patientMedicalHistory,
  medicalFollowUps,
  patientConditions,
  medicalDocuments,
} from '../db/schema';
import { requireUser, type AuthUser } from '../auth/current-user';
import {
  DOCUMENT_MAX_BYTES,
  claveValida,
  sniff,
  UploadRejectedError,
  type StorageProvider,
} from '../services/storage.service';
import { uploadRateLimit } from '../middleware/rate-limit.middleware';
import {
  CreateMedicalHistorySchema,
  UpdateMedicalHistorySchema,
  CreateFollowUpSchema,
  UpdateFollowUpSchema,
  CreateConditionSchema,
  CreateDocumentSchema,
  type CreateMedicalHistoryDto,
  type UpdateMedicalHistoryDto,
  type CreateFollowUpDto,
  type UpdateFollowUpDto,
  type CreateConditionDto,
  type CreateDocumentDto,
} from '../dtos/patients.dto';

const ANY_ROLE = ['patient', 'doctor', 'admin'];
const CLINICIAN = ['doctor', 'admin'];

@Controller('/api/patients')
export class PatientsController {
  constructor(
    @InjectDB() private db: DrizzleDB,
    @Inject('StorageProvider') private storage: StorageProvider,
  ) {}

  /** EN: A patient may read only their own data; clinicians read anyone's. */
  private assertCanReadPatient(user: AuthUser, patientId: number) {
    if (user.role !== 'doctor' && user.role !== 'admin' && user.id !== patientId) {
      throw new ForbiddenException('No tienes permisos para ver estos datos');
    }
  }

  // ─── Medical history ────────────────────────────────────────────────────────

  /** EN: `GET /api/patients/patient/:patientId` — medical history. */
  @Get('/patient/:patientId')
  @Roles(ANY_ROLE)
  async history(@Param('patientId') patientId: string, @Ctx() c: Context) {
    const user = requireUser(c);
    const pid = Number(patientId);
    this.assertCanReadPatient(user, pid);

    const patient = alias(users, 'patient');
    const doctorUser = alias(users, 'doctor_user');
    return this.db
      .select({
        id: patientMedicalHistory.id,
        patientId: patientMedicalHistory.patientId,
        doctorId: patientMedicalHistory.doctorId,
        appointmentId: patientMedicalHistory.appointmentId,
        visitDate: patientMedicalHistory.visitDate,
        symptoms: patientMedicalHistory.symptoms,
        diagnosis: patientMedicalHistory.diagnosis,
        treatment: patientMedicalHistory.treatment,
        medications: patientMedicalHistory.medications,
        vitalSigns: patientMedicalHistory.vitalSigns,
        labResults: patientMedicalHistory.labResults,
        recommendations: patientMedicalHistory.recommendations,
        nextVisitDate: patientMedicalHistory.nextVisitDate,
        createdAt: patientMedicalHistory.createdAt,
        patientName: patient.name,
        doctorName: doctorUser.name,
        specialty: doctors.specialty,
      })
      .from(patientMedicalHistory)
      .innerJoin(patient, eq(patientMedicalHistory.patientId, patient.id))
      .innerJoin(doctorUser, eq(patientMedicalHistory.doctorId, doctorUser.id))
      .leftJoin(doctors, eq(patientMedicalHistory.doctorId, doctors.userId))
      .where(eq(patientMedicalHistory.patientId, pid))
      .orderBy(desc(patientMedicalHistory.visitDate));
  }

  /** EN: `POST /api/patients/patient/:patientId` — add history entry. */
  @Post('/patient/:patientId')
  @Roles(CLINICIAN)
  async createHistory(
    @Param('patientId') patientId: string,
    @Body(CreateMedicalHistorySchema) body: CreateMedicalHistoryDto,
    @Ctx() c: Context,
  ) {
    const user = requireUser(c);
    const [entry] = await this.db
      .insert(patientMedicalHistory)
      .values({
        patientId: Number(patientId),
        doctorId: user.id,
        appointmentId: body.appointmentId,
        visitDate: body.visitDate,
        symptoms: body.symptoms,
        diagnosis: body.diagnosis,
        treatment: body.treatment,
        medications: body.medications,
        vitalSigns: body.vitalSigns,
        labResults: body.labResults,
        recommendations: body.recommendations,
        nextVisitDate: body.nextVisitDate,
      })
      .returning();
    c.status(201);
    return entry;
  }

  /** EN: `PUT /api/patients/:historyId` — update entry (author or admin). */
  @Put('/:historyId')
  @Roles(CLINICIAN)
  async updateHistory(
    @Param('historyId') historyId: string,
    @Body(UpdateMedicalHistorySchema) body: UpdateMedicalHistoryDto,
    @Ctx() c: Context,
  ) {
    const user = requireUser(c);
    const id = Number(historyId);

    const [existing] = await this.db
      .select({ doctorId: patientMedicalHistory.doctorId })
      .from(patientMedicalHistory)
      .where(eq(patientMedicalHistory.id, id));
    if (!existing) throw new NotFoundException('Entrada de historial no encontrada');
    if (user.role !== 'admin' && existing.doctorId !== user.id) {
      throw new ForbiddenException('No puedes editar esta entrada');
    }

    const patch = this.pruneUndefined({
      visitDate: body.visitDate,
      symptoms: body.symptoms,
      diagnosis: body.diagnosis,
      treatment: body.treatment,
      medications: body.medications,
      vitalSigns: body.vitalSigns,
      labResults: body.labResults,
      recommendations: body.recommendations,
      nextVisitDate: body.nextVisitDate,
    });
    if (Object.keys(patch).length === 0) throw new BadRequestException('No hay campos para actualizar');
    patch.updatedAt = new Date();

    const [updated] = await this.db
      .update(patientMedicalHistory)
      .set(patch)
      .where(eq(patientMedicalHistory.id, id))
      .returning();
    return updated;
  }

  // ─── Follow-ups ───────────────────────────────────────────────────────────────

  /** EN: `GET /api/patients/follow-ups/patient/:patientId`. */
  @Get('/follow-ups/patient/:patientId')
  @Roles(ANY_ROLE)
  async patientFollowUps(@Param('patientId') patientId: string, @Ctx() c: Context) {
    const user = requireUser(c);
    const pid = Number(patientId);
    this.assertCanReadPatient(user, pid);

    const patient = alias(users, 'patient');
    const doctorUser = alias(users, 'doctor_user');
    return this.db
      .select({
        id: medicalFollowUps.id,
        patientId: medicalFollowUps.patientId,
        doctorId: medicalFollowUps.doctorId,
        originalAppointmentId: medicalFollowUps.originalAppointmentId,
        followUpType: medicalFollowUps.followUpType,
        scheduledDate: medicalFollowUps.scheduledDate,
        status: medicalFollowUps.status,
        notes: medicalFollowUps.notes,
        treatmentProgress: medicalFollowUps.treatmentProgress,
        medicationAdherence: medicalFollowUps.medicationAdherence,
        sideEffects: medicalFollowUps.sideEffects,
        patientName: patient.name,
        doctorName: doctorUser.name,
        specialty: doctors.specialty,
      })
      .from(medicalFollowUps)
      .innerJoin(patient, eq(medicalFollowUps.patientId, patient.id))
      .innerJoin(doctorUser, eq(medicalFollowUps.doctorId, doctorUser.id))
      .leftJoin(doctors, eq(medicalFollowUps.doctorId, doctors.userId))
      .where(eq(medicalFollowUps.patientId, pid))
      .orderBy(asc(medicalFollowUps.scheduledDate));
  }

  /** EN: `GET /api/patients/follow-ups/doctor` — caller doctor's pending ones. */
  @Get('/follow-ups/doctor')
  @Roles(CLINICIAN)
  async doctorFollowUps(@Ctx() c: Context) {
    const user = requireUser(c);
    const patient = alias(users, 'patient');
    const today = new Date().toISOString().split('T')[0];
    return this.db
      .select({
        id: medicalFollowUps.id,
        patientId: medicalFollowUps.patientId,
        doctorId: medicalFollowUps.doctorId,
        followUpType: medicalFollowUps.followUpType,
        scheduledDate: medicalFollowUps.scheduledDate,
        status: medicalFollowUps.status,
        notes: medicalFollowUps.notes,
        patientName: patient.name,
        patientEmail: patient.email,
      })
      .from(medicalFollowUps)
      .innerJoin(patient, eq(medicalFollowUps.patientId, patient.id))
      .where(
        and(
          eq(medicalFollowUps.doctorId, user.id),
          eq(medicalFollowUps.status, 'scheduled'),
          gte(medicalFollowUps.scheduledDate, today),
        ),
      )
      .orderBy(asc(medicalFollowUps.scheduledDate));
  }

  /** EN: `POST /api/patients/follow-ups` — create a follow-up. */
  @Post('/follow-ups')
  @Roles(CLINICIAN)
  async createFollowUp(@Body(CreateFollowUpSchema) body: CreateFollowUpDto, @Ctx() c: Context) {
    const user = requireUser(c);
    const [followUp] = await this.db
      .insert(medicalFollowUps)
      .values({
        patientId: body.patientId,
        doctorId: user.id,
        originalAppointmentId: body.originalAppointmentId,
        followUpType: body.followUpType,
        scheduledDate: body.scheduledDate,
        notes: body.notes,
      })
      .returning();
    c.status(201);
    return followUp;
  }

  /** EN: `PUT /api/patients/follow-ups/:followUpId` — update (author/admin). */
  @Put('/follow-ups/:followUpId')
  @Roles(CLINICIAN)
  async updateFollowUp(
    @Param('followUpId') followUpId: string,
    @Body(UpdateFollowUpSchema) body: UpdateFollowUpDto,
    @Ctx() c: Context,
  ) {
    const user = requireUser(c);
    const id = Number(followUpId);

    const [existing] = await this.db
      .select({ doctorId: medicalFollowUps.doctorId })
      .from(medicalFollowUps)
      .where(eq(medicalFollowUps.id, id));
    if (!existing) throw new NotFoundException('Seguimiento no encontrado');
    if (user.role !== 'admin' && existing.doctorId !== user.id) {
      throw new ForbiddenException('No puedes editar este seguimiento');
    }

    const patch = this.pruneUndefined({
      status: body.status,
      notes: body.notes,
      treatmentProgress: body.treatmentProgress,
      medicationAdherence: body.medicationAdherence,
      sideEffects: body.sideEffects,
    });
    if (Object.keys(patch).length === 0) throw new BadRequestException('No hay campos para actualizar');
    patch.updatedAt = new Date();

    const [updated] = await this.db
      .update(medicalFollowUps)
      .set(patch)
      .where(eq(medicalFollowUps.id, id))
      .returning();
    return updated;
  }

  // ─── Conditions ───────────────────────────────────────────────────────────────

  /** EN: `GET /api/patients/conditions/patient/:patientId`. */
  @Get('/conditions/patient/:patientId')
  @Roles(ANY_ROLE)
  async conditions(@Param('patientId') patientId: string, @Ctx() c: Context) {
    const user = requireUser(c);
    const pid = Number(patientId);
    this.assertCanReadPatient(user, pid);
    return this.db
      .select()
      .from(patientConditions)
      .where(eq(patientConditions.patientId, pid))
      .orderBy(desc(patientConditions.diagnosisDate));
  }

  /** EN: `POST /api/patients/conditions` — add a condition. */
  @Post('/conditions')
  @Roles(CLINICIAN)
  async createCondition(@Body(CreateConditionSchema) body: CreateConditionDto, @Ctx() c: Context) {
    const [condition] = await this.db
      .insert(patientConditions)
      .values({
        patientId: body.patientId,
        conditionType: body.conditionType,
        name: body.name,
        description: body.description,
        severity: body.severity,
        diagnosisDate: body.diagnosisDate,
        isActive: body.isActive,
      })
      .returning();
    c.status(201);
    return condition;
  }

  // ─── Documents ────────────────────────────────────────────────────────────────

  /** EN: `GET /api/patients/documents/patient/:patientId`. */
  @Get('/documents/patient/:patientId')
  @Roles(ANY_ROLE)
  async documents(@Param('patientId') patientId: string, @Ctx() c: Context) {
    const user = requireUser(c);
    const pid = Number(patientId);
    this.assertCanReadPatient(user, pid);

    const patient = alias(users, 'patient');
    const doctorUser = alias(users, 'doctor_user');
    return this.db
      .select({
        id: medicalDocuments.id,
        patientId: medicalDocuments.patientId,
        doctorId: medicalDocuments.doctorId,
        documentType: medicalDocuments.documentType,
        title: medicalDocuments.title,
        description: medicalDocuments.description,
        filePath: medicalDocuments.filePath,
        fileSize: medicalDocuments.fileSize,
        mimeType: medicalDocuments.mimeType,
        createdAt: medicalDocuments.createdAt,
        patientName: patient.name,
        doctorName: doctorUser.name,
      })
      .from(medicalDocuments)
      .innerJoin(patient, eq(medicalDocuments.patientId, patient.id))
      .innerJoin(doctorUser, eq(medicalDocuments.doctorId, doctorUser.id))
      .where(eq(medicalDocuments.patientId, pid))
      .orderBy(desc(medicalDocuments.createdAt));
  }

  /** EN: `POST /api/patients/documents` — add a document record. */
  @Post('/documents')
  @Roles(CLINICIAN)
  async createDocument(@Body(CreateDocumentSchema) body: CreateDocumentDto, @Ctx() c: Context) {
    const user = requireUser(c);
    const [doc] = await this.db
      .insert(medicalDocuments)
      .values({
        patientId: body.patientId,
        doctorId: user.id,
        documentType: body.documentType,
        title: body.title,
        description: body.description,
        filePath: body.filePath,
        fileSize: body.fileSize,
        mimeType: body.mimeType,
      })
      .returning();
    c.status(201);
    return doc;
  }

  /**
   * EN: `POST /api/patients/documents/upload` — store the file, return its key.
   * ES: Guarda el archivo y devuelve su clave. El registro se crea después con
   *     `POST /documents`, que es el que dice de quién es.
   */
  @Post('/documents/upload')
  @Roles(CLINICIAN)
  @UseMiddleware(uploadRateLimit)
  async uploadDocument(@Ctx() c: Context) {
    requireUser(c);

    const tipo = c.req.header('content-type') ?? '';
    if (!tipo.toLowerCase().includes('multipart/form-data')) {
      throw new BadRequestException('Manda el archivo como multipart/form-data');
    }

    let form: FormData;
    try {
      form = await c.req.formData();
    } catch {
      throw new BadRequestException('No se pudo leer el formulario');
    }

    const archivo = form.get('file');
    if (!(archivo instanceof File)) throw new BadRequestException('Falta el campo "file"');
    if (archivo.size === 0) throw new BadRequestException('El archivo viene vacío');
    if (archivo.size > DOCUMENT_MAX_BYTES) {
      throw new BadRequestException(
        `El archivo pesa ${Math.ceil(archivo.size / 1024)} kB y el límite son ${DOCUMENT_MAX_BYTES / 1024} kB`,
      );
    }

    const data = new Uint8Array(await archivo.arrayBuffer());
    const firma = sniff(data);
    if (!firma) throw new BadRequestException('Solo se aceptan PDF, JPEG, PNG o WebP');

    try {
      const guardado = await this.storage.put({ data, ...firma });
      return { ...guardado, filename: archivo.name };
    } catch (error) {
      if (error instanceof UploadRejectedError) throw new BadRequestException(error.message);
      throw error;
    }
  }

  /**
   * EN: `GET /api/patients/documents/:id/file` — download, if you may read it.
   * ES: La descarga va por el id del documento y no por la clave: el id es lo
   *     único que dice de qué paciente es el archivo. Un análisis no se sirve
   *     en abierto solo porque alguien adivine un nombre.
   */
  @Get('/documents/:id/file')
  @Roles(ANY_ROLE)
  async documentFile(@Param('id') id: string, @Ctx() c: Context) {
    const user = requireUser(c);
    const [doc] = await this.db
      .select()
      .from(medicalDocuments)
      .where(eq(medicalDocuments.id, Number(id)));
    if (!doc) throw new NotFoundException('Ese documento no existe');
    this.assertCanReadPatient(user, doc.patientId);

    // Los registros viejos guardaban una referencia escrita a mano, no un
    // archivo. Esos no tienen nada que descargar.
    if (!doc.filePath || !claveValida(doc.filePath)) {
      throw new NotFoundException('Ese documento no tiene archivo adjunto');
    }

    const respuesta = await this.storage.serve(doc.filePath, doc.title);
    if (!respuesta) throw new NotFoundException('El archivo ya no está');
    return respuesta;
  }

  /** EN: Drop keys whose value is `undefined` so partial updates stay sparse. */
  private pruneUndefined<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
    return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));
  }
}
