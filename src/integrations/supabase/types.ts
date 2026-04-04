export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      asignaciones: {
        Row: {
          conductor_id: string
          created_at: string
          disponibilidad: Database["public"]["Enums"]["estado_disponibilidad"]
          disponible_at: string | null
          empresa_id: string
          estado: Database["public"]["Enums"]["estado_asignacion"]
          fecha_fin: string | null
          fecha_inicio: string
          id: string
          vehiculo_id: string
        }
        Insert: {
          conductor_id: string
          created_at?: string
          disponibilidad?: Database["public"]["Enums"]["estado_disponibilidad"]
          disponible_at?: string | null
          empresa_id: string
          estado?: Database["public"]["Enums"]["estado_asignacion"]
          fecha_fin?: string | null
          fecha_inicio?: string
          id?: string
          vehiculo_id: string
        }
        Update: {
          conductor_id?: string
          created_at?: string
          disponibilidad?: Database["public"]["Enums"]["estado_disponibilidad"]
          disponible_at?: string | null
          empresa_id?: string
          estado?: Database["public"]["Enums"]["estado_asignacion"]
          fecha_fin?: string | null
          fecha_inicio?: string
          id?: string
          vehiculo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_asignaciones_conductor"
            columns: ["conductor_id"]
            isOneToOne: false
            referencedRelation: "conductores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_asignaciones_vehiculo"
            columns: ["vehiculo_id"]
            isOneToOne: false
            referencedRelation: "vehiculos"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          accion: Database["public"]["Enums"]["accion_audit"]
          antes: Json | null
          created_at: string
          despues: Json | null
          dia_operacion_id: string | null
          empresa_id: string
          id: string
          rol: string | null
          semana_id: string | null
          user_id: string | null
          vehiculo_id: string | null
          viaje_id: string | null
        }
        Insert: {
          accion: Database["public"]["Enums"]["accion_audit"]
          antes?: Json | null
          created_at?: string
          despues?: Json | null
          dia_operacion_id?: string | null
          empresa_id: string
          id?: string
          rol?: string | null
          semana_id?: string | null
          user_id?: string | null
          vehiculo_id?: string | null
          viaje_id?: string | null
        }
        Update: {
          accion?: Database["public"]["Enums"]["accion_audit"]
          antes?: Json | null
          created_at?: string
          despues?: Json | null
          dia_operacion_id?: string | null
          empresa_id?: string
          id?: string
          rol?: string | null
          semana_id?: string | null
          user_id?: string | null
          vehiculo_id?: string | null
          viaje_id?: string | null
        }
        Relationships: []
      }
      conductores: {
        Row: {
          apellidos: string
          cedula_frontal_url: string | null
          cedula_trasera_url: string | null
          celular: string
          codigo: string
          created_at: string
          domicilio: string
          email: string
          empresa_id: string
          estado: Database["public"]["Enums"]["estado"]
          estado_civil: string
          fecha_caducidad_licencia: string
          fecha_nacimiento: string
          foto_url: string | null
          id: string
          identificacion: string
          licencia_frontal_url: string | null
          licencia_trasera_url: string | null
          nacionalidad: string
          nombres: string
          tipo_licencia: string
        }
        Insert: {
          apellidos?: string
          cedula_frontal_url?: string | null
          cedula_trasera_url?: string | null
          celular: string
          codigo: string
          created_at?: string
          domicilio: string
          email: string
          empresa_id: string
          estado?: Database["public"]["Enums"]["estado"]
          estado_civil: string
          fecha_caducidad_licencia: string
          fecha_nacimiento: string
          foto_url?: string | null
          id?: string
          identificacion: string
          licencia_frontal_url?: string | null
          licencia_trasera_url?: string | null
          nacionalidad: string
          nombres: string
          tipo_licencia: string
        }
        Update: {
          apellidos?: string
          cedula_frontal_url?: string | null
          cedula_trasera_url?: string | null
          celular?: string
          codigo?: string
          created_at?: string
          domicilio?: string
          email?: string
          empresa_id?: string
          estado?: Database["public"]["Enums"]["estado"]
          estado_civil?: string
          fecha_caducidad_licencia?: string
          fecha_nacimiento?: string
          foto_url?: string | null
          id?: string
          identificacion?: string
          licencia_frontal_url?: string | null
          licencia_trasera_url?: string | null
          nacionalidad?: string
          nombres?: string
          tipo_licencia?: string
        }
        Relationships: []
      }
      dias_operacion: {
        Row: {
          conductor_dia_finalizado_at: string | null
          created_at: string
          empresa_id: string
          fecha: string
          gerencia_dia_finalizado_at: string | null
          id: string
          observacion: string | null
          semana_id: string
          updated_at: string
        }
        Insert: {
          conductor_dia_finalizado_at?: string | null
          created_at?: string
          empresa_id: string
          fecha: string
          gerencia_dia_finalizado_at?: string | null
          id?: string
          observacion?: string | null
          semana_id: string
          updated_at?: string
        }
        Update: {
          conductor_dia_finalizado_at?: string | null
          created_at?: string
          empresa_id?: string
          fecha?: string
          gerencia_dia_finalizado_at?: string | null
          id?: string
          observacion?: string | null
          semana_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_dias_operacion_semana"
            columns: ["semana_id"]
            isOneToOne: false
            referencedRelation: "semanas"
            referencedColumns: ["id"]
          },
        ]
      }
      egresos_viaje: {
        Row: {
          aceite: number
          alimentacion: number
          almuerzo: boolean
          combustible: number
          combustible_foto_url: string | null
          created_at: string
          desayuno: boolean
          empresa_id: string
          hotel: number
          id: string
          merienda: boolean
          pago_conductor: number
          peaje: number
          total_egreso: number
          updated_at: string
          varios: number
          varios_foto_url: string | null
          varios_texto: string | null
          viaje_id: string
        }
        Insert: {
          aceite?: number
          alimentacion?: number
          almuerzo?: boolean
          combustible?: number
          combustible_foto_url?: string | null
          created_at?: string
          desayuno?: boolean
          empresa_id: string
          hotel?: number
          id?: string
          merienda?: boolean
          pago_conductor?: number
          peaje?: number
          total_egreso?: number
          updated_at?: string
          varios?: number
          varios_foto_url?: string | null
          varios_texto?: string | null
          viaje_id: string
        }
        Update: {
          aceite?: number
          alimentacion?: number
          almuerzo?: boolean
          combustible?: number
          combustible_foto_url?: string | null
          created_at?: string
          desayuno?: boolean
          empresa_id?: string
          hotel?: number
          id?: string
          merienda?: boolean
          pago_conductor?: number
          peaje?: number
          total_egreso?: number
          updated_at?: string
          varios?: number
          varios_foto_url?: string | null
          varios_texto?: string | null
          viaje_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_egresos_viaje"
            columns: ["viaje_id"]
            isOneToOne: true
            referencedRelation: "viajes"
            referencedColumns: ["id"]
          },
        ]
      }
      empresas: {
        Row: {
          activo: boolean
          celular: string
          ciudad: string
          ciudad_real: string
          comision_fija: number
          comision_pct: number
          created_at: string
          direccion: string
          email: string
          frecuencia_comision: Database["public"]["Enums"]["frecuencia_comision"]
          id: string
          logo_url: string | null
          nombre: string
          propietario_apellidos: string
          propietario_nombre: string
          ruc: string
          tipo_comision: Database["public"]["Enums"]["tipo_comision_empresa"]
        }
        Insert: {
          activo?: boolean
          celular: string
          ciudad: string
          ciudad_real?: string
          comision_fija?: number
          comision_pct?: number
          created_at?: string
          direccion: string
          email: string
          frecuencia_comision?: Database["public"]["Enums"]["frecuencia_comision"]
          id?: string
          logo_url?: string | null
          nombre: string
          propietario_apellidos?: string
          propietario_nombre: string
          ruc: string
          tipo_comision?: Database["public"]["Enums"]["tipo_comision_empresa"]
        }
        Update: {
          activo?: boolean
          celular?: string
          ciudad?: string
          ciudad_real?: string
          comision_fija?: number
          comision_pct?: number
          created_at?: string
          direccion?: string
          email?: string
          frecuencia_comision?: Database["public"]["Enums"]["frecuencia_comision"]
          id?: string
          logo_url?: string | null
          nombre?: string
          propietario_apellidos?: string
          propietario_nombre?: string
          ruc?: string
          tipo_comision?: Database["public"]["Enums"]["tipo_comision_empresa"]
        }
        Relationships: []
      }
      ingresos_viaje: {
        Row: {
          comision_gerencia: number
          created_at: string
          empresa_id: string
          encomiendas_monto: number
          id: string
          pasajeros_monto: number
          total_ingreso: number
          updated_at: string
          viaje_id: string
        }
        Insert: {
          comision_gerencia?: number
          created_at?: string
          empresa_id: string
          encomiendas_monto?: number
          id?: string
          pasajeros_monto?: number
          total_ingreso?: number
          updated_at?: string
          viaje_id: string
        }
        Update: {
          comision_gerencia?: number
          created_at?: string
          empresa_id?: string
          encomiendas_monto?: number
          id?: string
          pasajeros_monto?: number
          total_ingreso?: number
          updated_at?: string
          viaje_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_ingresos_viaje"
            columns: ["viaje_id"]
            isOneToOne: true
            referencedRelation: "viajes"
            referencedColumns: ["id"]
          },
        ]
      }
      invitaciones: {
        Row: {
          created_at: string
          empresa_id: string
          expires_at: string
          id: string
          rol: Database["public"]["Enums"]["invitacion_rol"]
          token: string
          usada: boolean
          used_by_email: string | null
        }
        Insert: {
          created_at?: string
          empresa_id: string
          expires_at: string
          id?: string
          rol: Database["public"]["Enums"]["invitacion_rol"]
          token: string
          usada?: boolean
          used_by_email?: string | null
        }
        Update: {
          created_at?: string
          empresa_id?: string
          expires_at?: string
          id?: string
          rol?: Database["public"]["Enums"]["invitacion_rol"]
          token?: string
          usada?: boolean
          used_by_email?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_invitaciones_empresa"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          activo: boolean
          conductor_id: string | null
          created_at: string
          email: string
          empresa_id: string
          id: string
          propietario_id: string | null
          user_id: string
          username: string
        }
        Insert: {
          activo?: boolean
          conductor_id?: string | null
          created_at?: string
          email: string
          empresa_id: string
          id?: string
          propietario_id?: string | null
          user_id: string
          username: string
        }
        Update: {
          activo?: boolean
          conductor_id?: string | null
          created_at?: string
          email?: string
          empresa_id?: string
          id?: string
          propietario_id?: string | null
          user_id?: string
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_profiles_conductor_fk"
            columns: ["conductor_id"]
            isOneToOne: false
            referencedRelation: "conductores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_profiles_propietario_fk"
            columns: ["propietario_id"]
            isOneToOne: false
            referencedRelation: "propietarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      propietarios: {
        Row: {
          apellidos: string
          celular: string
          codigo: string
          created_at: string
          direccion: string
          email: string
          empresa_id: string
          estado: Database["public"]["Enums"]["estado"]
          estado_civil: string
          fecha_nacimiento: string
          foto_url: string | null
          id: string
          identificacion: string
          nacionalidad: string
          nombres: string
        }
        Insert: {
          apellidos?: string
          celular: string
          codigo: string
          created_at?: string
          direccion: string
          email: string
          empresa_id: string
          estado?: Database["public"]["Enums"]["estado"]
          estado_civil: string
          fecha_nacimiento: string
          foto_url?: string | null
          id?: string
          identificacion: string
          nacionalidad: string
          nombres: string
        }
        Update: {
          apellidos?: string
          celular?: string
          codigo?: string
          created_at?: string
          direccion?: string
          email?: string
          empresa_id?: string
          estado?: Database["public"]["Enums"]["estado"]
          estado_civil?: string
          fecha_nacimiento?: string
          foto_url?: string | null
          id?: string
          identificacion?: string
          nacionalidad?: string
          nombres?: string
        }
        Relationships: []
      }
      semanas: {
        Row: {
          conductor_semana_finalizada_at: string | null
          conductor_semana_finalizada_by: string | null
          created_at: string
          empresa_id: string
          estado: Database["public"]["Enums"]["estado_semana"]
          fecha_fin: string
          fecha_inicio: string
          gerencia_semana_finalizada_at: string | null
          gerencia_semana_finalizada_by: string | null
          id: string
          motivo_reapertura: string | null
          propietario_id: string
          propietario_semana_cerrada_at: string | null
          propietario_semana_cerrada_by: string | null
          reabierta_at: string | null
          reabierta_by: string | null
          reabierta_by_user_id: string | null
          updated_at: string
          vehiculo_id: string
        }
        Insert: {
          conductor_semana_finalizada_at?: string | null
          conductor_semana_finalizada_by?: string | null
          created_at?: string
          empresa_id: string
          estado?: Database["public"]["Enums"]["estado_semana"]
          fecha_fin: string
          fecha_inicio: string
          gerencia_semana_finalizada_at?: string | null
          gerencia_semana_finalizada_by?: string | null
          id?: string
          motivo_reapertura?: string | null
          propietario_id: string
          propietario_semana_cerrada_at?: string | null
          propietario_semana_cerrada_by?: string | null
          reabierta_at?: string | null
          reabierta_by?: string | null
          reabierta_by_user_id?: string | null
          updated_at?: string
          vehiculo_id: string
        }
        Update: {
          conductor_semana_finalizada_at?: string | null
          conductor_semana_finalizada_by?: string | null
          created_at?: string
          empresa_id?: string
          estado?: Database["public"]["Enums"]["estado_semana"]
          fecha_fin?: string
          fecha_inicio?: string
          gerencia_semana_finalizada_at?: string | null
          gerencia_semana_finalizada_by?: string | null
          id?: string
          motivo_reapertura?: string | null
          propietario_id?: string
          propietario_semana_cerrada_at?: string | null
          propietario_semana_cerrada_by?: string | null
          reabierta_at?: string | null
          reabierta_by?: string | null
          reabierta_by_user_id?: string | null
          updated_at?: string
          vehiculo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_semanas_propietario"
            columns: ["propietario_id"]
            isOneToOne: false
            referencedRelation: "propietarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_semanas_vehiculo"
            columns: ["vehiculo_id"]
            isOneToOne: false
            referencedRelation: "vehiculos"
            referencedColumns: ["id"]
          },
        ]
      }
      solicitudes_baja: {
        Row: {
          created_at: string
          empresa_id: string
          estado: string
          id: string
          motivo: string
          motivo_rechazo: string | null
          resuelto_at: string | null
          resuelto_por: string | null
          solicitado_por: string
        }
        Insert: {
          created_at?: string
          empresa_id: string
          estado?: string
          id?: string
          motivo?: string
          motivo_rechazo?: string | null
          resuelto_at?: string | null
          resuelto_por?: string | null
          solicitado_por: string
        }
        Update: {
          created_at?: string
          empresa_id?: string
          estado?: string
          id?: string
          motivo?: string
          motivo_rechazo?: string | null
          resuelto_at?: string | null
          resuelto_por?: string | null
          solicitado_por?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vehiculo_alimentacion: {
        Row: {
          alimentacion_habilitada: boolean
          almuerzo_habilitado: boolean
          created_at: string
          desayuno_habilitado: boolean
          empresa_id: string
          id: string
          merienda_habilitado: boolean
          updated_at: string
          valor_comida: number
          vehiculo_id: string
        }
        Insert: {
          alimentacion_habilitada?: boolean
          almuerzo_habilitado?: boolean
          created_at?: string
          desayuno_habilitado?: boolean
          empresa_id: string
          id?: string
          merienda_habilitado?: boolean
          updated_at?: string
          valor_comida?: number
          vehiculo_id: string
        }
        Update: {
          alimentacion_habilitada?: boolean
          almuerzo_habilitado?: boolean
          created_at?: string
          desayuno_habilitado?: boolean
          empresa_id?: string
          id?: string
          merienda_habilitado?: boolean
          updated_at?: string
          valor_comida?: number
          vehiculo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_vehiculo_alimentacion_vehiculo"
            columns: ["vehiculo_id"]
            isOneToOne: true
            referencedRelation: "vehiculos"
            referencedColumns: ["id"]
          },
        ]
      }
      vehiculo_disponibilidad: {
        Row: {
          created_at: string
          disponible: Database["public"]["Enums"]["estado_disponibilidad"]
          empresa_id: string
          id: string
          marcado_at: string
          marcado_by: string | null
          updated_at: string
          vehiculo_id: string
        }
        Insert: {
          created_at?: string
          disponible?: Database["public"]["Enums"]["estado_disponibilidad"]
          empresa_id: string
          id?: string
          marcado_at?: string
          marcado_by?: string | null
          updated_at?: string
          vehiculo_id: string
        }
        Update: {
          created_at?: string
          disponible?: Database["public"]["Enums"]["estado_disponibilidad"]
          empresa_id?: string
          id?: string
          marcado_at?: string
          marcado_by?: string | null
          updated_at?: string
          vehiculo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_vehiculo_disponibilidad_vehiculo"
            columns: ["vehiculo_id"]
            isOneToOne: true
            referencedRelation: "vehiculos"
            referencedColumns: ["id"]
          },
        ]
      }
      vehiculos: {
        Row: {
          anio: number | null
          capacidad: number
          color: string
          created_at: string
          empresa_id: string
          estado: Database["public"]["Enums"]["estado"]
          foto_url: string | null
          gps: boolean
          id: string
          marca: string
          modelo: string
          placa: string
          propietario_id: string
          seguro: boolean
          tipo: string
        }
        Insert: {
          anio?: number | null
          capacidad: number
          color: string
          created_at?: string
          empresa_id: string
          estado?: Database["public"]["Enums"]["estado"]
          foto_url?: string | null
          gps?: boolean
          id?: string
          marca: string
          modelo: string
          placa: string
          propietario_id: string
          seguro?: boolean
          tipo?: string
        }
        Update: {
          anio?: number | null
          capacidad?: number
          color?: string
          created_at?: string
          empresa_id?: string
          estado?: Database["public"]["Enums"]["estado"]
          foto_url?: string | null
          gps?: boolean
          id?: string
          marca?: string
          modelo?: string
          placa?: string
          propietario_id?: string
          seguro?: boolean
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_vehiculos_propietario"
            columns: ["propietario_id"]
            isOneToOne: false
            referencedRelation: "propietarios"
            referencedColumns: ["id"]
          },
        ]
      }
      viaje_dia_control: {
        Row: {
          conductor_dia_finalizado_at: string | null
          conductor_dia_finalizado_by: string | null
          conductor_dia_reabierto_at: string | null
          conductor_dia_reabierto_by: string | null
          created_at: string
          empresa_id: string
          gerencia_dia_finalizado_at: string | null
          gerencia_dia_finalizado_by: string | null
          gerencia_dia_reabierto_at: string | null
          gerencia_dia_reabierto_by: string | null
          id: string
          updated_at: string
          viaje_id: string
        }
        Insert: {
          conductor_dia_finalizado_at?: string | null
          conductor_dia_finalizado_by?: string | null
          conductor_dia_reabierto_at?: string | null
          conductor_dia_reabierto_by?: string | null
          created_at?: string
          empresa_id: string
          gerencia_dia_finalizado_at?: string | null
          gerencia_dia_finalizado_by?: string | null
          gerencia_dia_reabierto_at?: string | null
          gerencia_dia_reabierto_by?: string | null
          id?: string
          updated_at?: string
          viaje_id: string
        }
        Update: {
          conductor_dia_finalizado_at?: string | null
          conductor_dia_finalizado_by?: string | null
          conductor_dia_reabierto_at?: string | null
          conductor_dia_reabierto_by?: string | null
          created_at?: string
          empresa_id?: string
          gerencia_dia_finalizado_at?: string | null
          gerencia_dia_finalizado_by?: string | null
          gerencia_dia_reabierto_at?: string | null
          gerencia_dia_reabierto_by?: string | null
          id?: string
          updated_at?: string
          viaje_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_viaje_dia_control_viaje"
            columns: ["viaje_id"]
            isOneToOne: true
            referencedRelation: "viajes"
            referencedColumns: ["id"]
          },
        ]
      }
      viajes: {
        Row: {
          asignacion_id: string | null
          cantidad_pasajeros: number | null
          created_at: string
          destino: string
          dia_operacion_id: string | null
          empresa_id: string
          estado: Database["public"]["Enums"]["estado_viaje"]
          fecha_llegada: string | null
          fecha_salida: string
          hora_salida: string | null
          id: string
          origen: string
          semana_id: string | null
        }
        Insert: {
          asignacion_id?: string | null
          cantidad_pasajeros?: number | null
          created_at?: string
          destino: string
          dia_operacion_id?: string | null
          empresa_id: string
          estado?: Database["public"]["Enums"]["estado_viaje"]
          fecha_llegada?: string | null
          fecha_salida: string
          hora_salida?: string | null
          id?: string
          origen: string
          semana_id?: string | null
        }
        Update: {
          asignacion_id?: string | null
          cantidad_pasajeros?: number | null
          created_at?: string
          destino?: string
          dia_operacion_id?: string | null
          empresa_id?: string
          estado?: Database["public"]["Enums"]["estado_viaje"]
          fecha_llegada?: string | null
          fecha_salida?: string
          hora_salida?: string | null
          id?: string
          origen?: string
          semana_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_viajes_asignacion"
            columns: ["asignacion_id"]
            isOneToOne: false
            referencedRelation: "asignaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_viajes_dia_operacion"
            columns: ["dia_operacion_id"]
            isOneToOne: false
            referencedRelation: "dias_operacion"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_viajes_semana"
            columns: ["semana_id"]
            isOneToOne: false
            referencedRelation: "semanas"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_empresa_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      accion_audit:
        | "CONDUCTOR_DIA_FINALIZADO"
        | "CONDUCTOR_DIA_REABIERTO"
        | "GERENCIA_DIA_FINALIZADO"
        | "GERENCIA_DIA_REABIERTO"
        | "CONDUCTOR_SEMANA_FINALIZADA"
        | "CONDUCTOR_SEMANA_REABIERTA"
        | "GERENCIA_SEMANA_FINALIZADA"
        | "GERENCIA_SEMANA_REABIERTA"
        | "PROPIETARIO_SEMANA_CERRADA"
        | "PROPIETARIO_SEMANA_REABIERTA"
        | "CONDUCTOR_VEHICULO_EN_RUTA"
        | "INGRESOS_EDITADOS"
        | "EGRESOS_EDITADOS"
        | "CONDUCTOR_VEHICULO_DISPONIBLE"
        | "CONDUCTOR_VEHICULO_NO_DISPONIBLE"
        | "LINK_CONDUCTOR_GENERADO"
        | "LINK_PROPIETARIO_GENERADO"
        | "LINK_GERENCIA_GENERADO"
        | "PROPIETARIO_ELIMINADO"
        | "CONDUCTOR_ELIMINADO"
        | "VEHICULO_ELIMINADO"
        | "ASIGNACION_CREADA"
        | "ASIGNACION_CERRADA"
        | "REPORTE_IMPRESO"
        | "EMPRESA_SUSPENDIDA"
        | "EMPRESA_REACTIVADA"
        | "EMPRESA_ELIMINADA"
        | "SOLICITUD_BAJA_APROBADA"
        | "SOLICITUD_BAJA_RECHAZADA"
      app_role: "GERENCIA" | "CONDUCTOR" | "PROPIETARIO" | "SUPER_ADMIN"
      estado: "HABILITADO" | "INHABILITADO"
      estado_asignacion: "ACTIVA" | "CERRADA"
      estado_disponibilidad: "DISPONIBLE" | "EN_RUTA"
      estado_semana: "ABIERTA" | "CERRADA"
      estado_viaje:
        | "BORRADOR"
        | "CERRADO"
        | "ASIGNADO"
        | "EN_RUTA"
        | "FINALIZADO"
      frecuencia_comision: "SEMANAL" | "QUINCENAL" | "MENSUAL" | "BISEMANAL"
      invitacion_rol: "CONDUCTOR" | "PROPIETARIO" | "GERENCIA"
      tipo_comision_empresa: "PORCENTAJE" | "FIJO" | "MIXTO"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      accion_audit: [
        "CONDUCTOR_DIA_FINALIZADO",
        "CONDUCTOR_DIA_REABIERTO",
        "GERENCIA_DIA_FINALIZADO",
        "GERENCIA_DIA_REABIERTO",
        "CONDUCTOR_SEMANA_FINALIZADA",
        "CONDUCTOR_SEMANA_REABIERTA",
        "GERENCIA_SEMANA_FINALIZADA",
        "GERENCIA_SEMANA_REABIERTA",
        "PROPIETARIO_SEMANA_CERRADA",
        "PROPIETARIO_SEMANA_REABIERTA",
        "CONDUCTOR_VEHICULO_EN_RUTA",
        "INGRESOS_EDITADOS",
        "EGRESOS_EDITADOS",
        "CONDUCTOR_VEHICULO_DISPONIBLE",
        "CONDUCTOR_VEHICULO_NO_DISPONIBLE",
        "LINK_CONDUCTOR_GENERADO",
        "LINK_PROPIETARIO_GENERADO",
        "LINK_GERENCIA_GENERADO",
        "PROPIETARIO_ELIMINADO",
        "CONDUCTOR_ELIMINADO",
        "VEHICULO_ELIMINADO",
        "ASIGNACION_CREADA",
        "ASIGNACION_CERRADA",
        "REPORTE_IMPRESO",
        "EMPRESA_SUSPENDIDA",
        "EMPRESA_REACTIVADA",
        "EMPRESA_ELIMINADA",
        "SOLICITUD_BAJA_APROBADA",
        "SOLICITUD_BAJA_RECHAZADA",
      ],
      app_role: ["GERENCIA", "CONDUCTOR", "PROPIETARIO", "SUPER_ADMIN"],
      estado: ["HABILITADO", "INHABILITADO"],
      estado_asignacion: ["ACTIVA", "CERRADA"],
      estado_disponibilidad: ["DISPONIBLE", "EN_RUTA"],
      estado_semana: ["ABIERTA", "CERRADA"],
      estado_viaje: [
        "BORRADOR",
        "CERRADO",
        "ASIGNADO",
        "EN_RUTA",
        "FINALIZADO",
      ],
      frecuencia_comision: ["SEMANAL", "QUINCENAL", "MENSUAL", "BISEMANAL"],
      invitacion_rol: ["CONDUCTOR", "PROPIETARIO", "GERENCIA"],
      tipo_comision_empresa: ["PORCENTAJE", "FIJO", "MIXTO"],
    },
  },
} as const
