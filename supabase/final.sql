-- =============================================================================
-- ESTRUCTURA FINAL DE BASE DE DATOS - SISTEMA DE SOLICITUDES DE SEGUROS DE CAMBIO
-- Consolidado de todas las migraciones de Supabase (17/09/2024 - 30/10/2024)
-- Convertido a Microsoft SQL Server 2016
-- =============================================================================

-- =============================================================================
-- SCHEMAS
-- =============================================================================


-- =============================================================================
-- TYPES
-- =============================================================================
-- Create table type for storing arrays (replacement for PostgreSQL arrays)
IF EXISTS (SELECT * FROM sys.types WHERE name = 'StringArrayType' AND is_table_type = 1)
    DROP TYPE StringArrayType
CREATE TYPE StringArrayType AS TABLE (
    value NVARCHAR(MAX)
);
GO

-- =============================================================================
-- TABLES
-- =============================================================================


-- Currency requests table - main business entity
IF EXISTS (SELECT * FROM sys.tables WHERE name = 'currency_requests' AND schema_id = SCHEMA_ID('frwrd'))
    DROP TABLE frwrd.currency_requests
CREATE TABLE frwrd.currency_requests (
    id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    user_id VARCHAR(12) NOT NULL,
    cliente NVARCHAR(MAX) NOT NULL,
    rut NVARCHAR(50) NOT NULL,
    monto_negocio_usd DECIMAL(15,2) NOT NULL,
    unidades INT NOT NULL,
    numeros_internos NVARCHAR(MAX) NOT NULL DEFAULT '[]', -- JSON array as string
    notas NVARCHAR(MAX),
    banco NVARCHAR(255),
    dias_forward INT,
    porcentaje_cobertura DECIMAL(5,2),
    payments NVARCHAR(MAX) NOT NULL DEFAULT '[]', -- JSON as string with constraint
    estado NVARCHAR(50) NOT NULL DEFAULT 'BORRADOR',
    numero_sie NVARCHAR(255),
    tc_referencial NUMERIC(18,6),
    tc_cliente NUMERIC(18,6),
    tc_spot NUMERIC(18,6),
    puntos_forwards NUMERIC(18,6),
    tc_all_in NUMERIC(18,6),
    bank_comparison_data NVARCHAR(MAX) DEFAULT NULL, -- JSON as string
    fecha_vencimiento DATETIMEOFFSET,
    valor_factura_usd_neto NUMERIC(18,6),
    valor_factura_usd_total NUMERIC(18,6),
    tc_factura NUMERIC(18,6),
    total_factura_clp NUMERIC(18,6),
    created_at DATETIMEOFFSET NOT NULL DEFAULT GETDATE(),
    updated_at DATETIMEOFFSET NOT NULL DEFAULT GETDATE(),
    
    -- JSON validation constraints
    CONSTRAINT CK_currency_requests_payments_json CHECK (ISJSON(payments) = 1),
    CONSTRAINT CK_currency_requests_numeros_internos_json CHECK (ISJSON(numeros_internos) = 1),
    CONSTRAINT CK_currency_requests_bank_comparison_json CHECK (bank_comparison_data IS NULL OR ISJSON(bank_comparison_data) = 1)
);

GO

-- Bank executives table for contact information
IF EXISTS (SELECT * FROM sys.tables WHERE name = 'bank_executives' AND schema_id = SCHEMA_ID('frwrd'))
    DROP TABLE frwrd.bank_executives
CREATE TABLE frwrd.bank_executives (
    id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    name NVARCHAR(255) NOT NULL,
    contact_number NVARCHAR(50) NOT NULL,
    bank_name NVARCHAR(255) NOT NULL,
    created_at DATETIMEOFFSET NOT NULL DEFAULT GETDATE(),
    updated_at DATETIMEOFFSET NOT NULL DEFAULT GETDATE()
);

GO

-- Audit logs table for tracking critical actions
IF EXISTS (SELECT * FROM sys.tables WHERE name = 'audit_logs' AND schema_id = SCHEMA_ID('frwrd'))
    DROP TABLE frwrd.audit_logs
CREATE TABLE frwrd.audit_logs (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    table_name NVARCHAR(255) NOT NULL,
    record_id UNIQUEIDENTIFIER NOT NULL,
    action NVARCHAR(50) NOT NULL, -- 'INSERT', 'UPDATE', 'DELETE', 'STATUS_CHANGE', 'APPROVAL'
    old_data NVARCHAR(MAX), -- JSON as string
    new_data NVARCHAR(MAX), -- JSON as string
    user_id VARCHAR(12),
    user_email NVARCHAR(255),
    ip_address NVARCHAR(50),
    user_agent NVARCHAR(MAX),
    created_at DATETIMEOFFSET DEFAULT GETDATE() NOT NULL,
    
    -- JSON validation constraints
    CONSTRAINT CK_audit_logs_old_data_json CHECK (old_data IS NULL OR ISJSON(old_data) = 1),
    CONSTRAINT CK_audit_logs_new_data_json CHECK (new_data IS NULL OR ISJSON(new_data) = 1),
    
    -- Foreign key constraint
    CONSTRAINT FK_audit_logs_user_id FOREIGN KEY (user_id) REFERENCES Usuarios(id_usuario)
);

GO


-- =============================================================================
-- FUNCTIONS
-- =============================================================================

-- Function to get current user context (replacement for auth.uid())
IF OBJECT_ID('frwrd.get_current_user_id', 'FN') IS NOT NULL
    DROP FUNCTION frwrd.get_current_user_id
GO

CREATE FUNCTION frwrd.get_current_user_id()
RETURNS VARCHAR(12)
AS
BEGIN
    -- In a real implementation, this would get the current user from session context
    -- For now, returning NULL as a placeholder
    RETURN CAST(SESSION_CONTEXT(N'current_user_id') AS VARCHAR(12))
END
GO

-- Function to convert record to JSON (replacement for to_jsonb)
IF OBJECT_ID('frwrd.record_to_json', 'FN') IS NOT NULL
    DROP FUNCTION frwrd.record_to_json
GO

CREATE FUNCTION frwrd.record_to_json(@table_name NVARCHAR(255), @record_id UNIQUEIDENTIFIER)
RETURNS NVARCHAR(MAX)
AS
BEGIN
    DECLARE @json NVARCHAR(MAX)
    
    IF @table_name = 'currency_requests'
    BEGIN
        SELECT @json = (
            SELECT * FROM frwrd.currency_requests 
            WHERE id = @record_id 
            FOR JSON PATH, WITHOUT_ARRAY_WRAPPER
        )
    END
    
    RETURN @json
END
GO

-- =============================================================================
-- TRIGGERS
-- =============================================================================

-- Trigger to update updated_at column for currency_requests
IF OBJECT_ID('frwrd.tr_update_currency_requests_updated_at', 'TR') IS NOT NULL
    DROP TRIGGER frwrd.tr_update_currency_requests_updated_at
GO
-- inicial
CREATE TRIGGER frwrd.tr_update_currency_requests_updated_at
ON frwrd.currency_requests
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    
    UPDATE frwrd.currency_requests
    SET updated_at = GETDATE()
    FROM frwrd.currency_requests cr
    INNER JOIN inserted i ON cr.id = i.id
END
GO

-- Trigger to update updated_at column for bank_executives
IF OBJECT_ID('frwrd.tr_update_bank_executives_updated_at', 'TR') IS NOT NULL
    DROP TRIGGER frwrd.tr_update_bank_executives_updated_at
GO
-- inicial
CREATE TRIGGER frwrd.tr_update_bank_executives_updated_at
ON frwrd.bank_executives
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    
    UPDATE frwrd.bank_executives
    SET updated_at = GETDATE()
    FROM frwrd.bank_executives be
    INNER JOIN inserted i ON be.id = i.id
END
GO

-- Trigger for currency_requests auditing
IF OBJECT_ID('frwrd.tr_audit_currency_requests', 'TR') IS NOT NULL
    DROP TRIGGER frwrd.tr_audit_currency_requests
GO
-- inicial
CREATE TRIGGER frwrd.tr_audit_currency_requests
ON frwrd.currency_requests
AFTER INSERT, UPDATE, DELETE
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @user_email NVARCHAR(255) = 'gonzalo.calderon@epysa.cl'
    DECLARE @current_user_id VARCHAR(20) = frwrd.get_current_user_id()
    
    -- Handle INSERT operations
    IF EXISTS (SELECT * FROM inserted) AND NOT EXISTS (SELECT * FROM deleted)
    BEGIN
        INSERT INTO frwrd.audit_logs (
            table_name, record_id, action, new_data, user_id, user_email
        )
        SELECT 
            'currency_requests',
            i.id,
            'INSERT',
            (SELECT * FROM inserted WHERE id = i.id FOR JSON PATH, WITHOUT_ARRAY_WRAPPER),
            @current_user_id,
            @user_email
        FROM inserted i
    END
    
    -- Handle UPDATE operations
    IF EXISTS (SELECT * FROM inserted) AND EXISTS (SELECT * FROM deleted)
    BEGIN
        -- Check for status changes
        INSERT INTO frwrd.audit_logs (
            table_name, record_id, action, old_data, new_data, user_id, user_email
        )
        SELECT 
            'currency_requests',
            i.id,
            CASE 
                WHEN i.estado != d.estado THEN 'STATUS_CHANGE'
                ELSE 'UPDATE'
            END,
            CASE 
                WHEN i.estado != d.estado THEN '{"estado":"' + d.estado + '"}'
                ELSE (SELECT * FROM deleted WHERE id = d.id FOR JSON PATH, WITHOUT_ARRAY_WRAPPER)
            END,
            CASE 
                WHEN i.estado != d.estado THEN '{"estado":"' + i.estado + '"}'
                ELSE (SELECT * FROM inserted WHERE id = i.id FOR JSON PATH, WITHOUT_ARRAY_WRAPPER)
            END,
            @current_user_id,
            @user_email
        FROM inserted i
        INNER JOIN deleted d ON i.id = d.id
    END
    
    -- Handle DELETE operations
    IF NOT EXISTS (SELECT * FROM inserted) AND EXISTS (SELECT * FROM deleted)
    BEGIN
        INSERT INTO frwrd.audit_logs (
            table_name, record_id, action, old_data, user_id, user_email
        )
        SELECT 
            'currency_requests',
            d.id,
            'DELETE',
            (SELECT * FROM deleted WHERE id = d.id FOR JSON PATH, WITHOUT_ARRAY_WRAPPER),
            @current_user_id,
            @user_email
        FROM deleted d
    END
END
GO



-- =============================================================================
-- INITIAL DATA
-- =============================================================================

-- Insert sample bank executives (only if table is empty)
IF NOT EXISTS (SELECT 1 FROM frwrd.bank_executives)
BEGIN
    INSERT INTO frwrd.bank_executives (bank_name, name, contact_number) VALUES
    ('BCI', 'Juan Pérez', '+56 9 1234 5678'),
    ('CHILE', 'María González', '+56 9 2345 6789'),
    ('ESTADO', 'Carlos López', '+56 9 3456 7890'),
    ('SANTANDER', 'Ana Martínez', '+56 9 4567 8901'),
    ('SECURITY', 'Pedro Rodríguez', '+56 9 5678 9012'),
    ('ITAU CORPBANCA', 'Laura Silva', '+56 9 6789 0123'),
    ('BICE', 'Roberto Chen', '+56 9 7890 1234'),
    ('SCOTIABANK', 'Carmen Soto', '+56 9 8901 2345');
END
GO

-- =============================================================================
-- INDEXES FOR PERFORMANCE
-- =============================================================================

-- Index on currency_requests for common queries
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_currency_requests_user_id')
BEGIN
    CREATE INDEX IX_currency_requests_user_id ON frwrd.currency_requests (user_id);
END

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_currency_requests_estado')
BEGIN
    CREATE INDEX IX_currency_requests_estado ON frwrd.currency_requests (estado);
END

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_currency_requests_created_at')
BEGIN
    CREATE INDEX IX_currency_requests_created_at ON frwrd.currency_requests (created_at);
END

-- Index on audit_logs for common queries
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_audit_logs_table_record')
BEGIN
    CREATE INDEX IX_audit_logs_table_record ON frwrd.audit_logs (table_name, record_id);
END

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_audit_logs_user_id')
BEGIN
    CREATE INDEX IX_audit_logs_user_id ON frwrd.audit_logs (user_id);
END

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_audit_logs_created_at')
BEGIN
    CREATE INDEX IX_audit_logs_created_at ON frwrd.audit_logs (created_at);
END

-- =============================================================================
-- HELPER PROCEDURES
-- =============================================================================

-- Procedure to set current user context
IF OBJECT_ID('frwrd.sp_set_current_user', 'P') IS NOT NULL
    DROP PROCEDURE frwrd.sp_set_current_user
GO
--inicial
CREATE PROCEDURE frwrd.sp_set_current_user
    @user_id VARCHAR(12)
AS
BEGIN
    EXEC sp_set_session_context @key = N'current_user_id', @value = @user_id
END
GO


-- END OF FILE
-- =============================================================================



GO
IF OBJECT_ID('frwrd.list_currency_requests', 'P') IS NOT NULL
    DROP PROCEDURE frwrd.list_currency_requests
GO
--INICIAL
CREATE PROCEDURE frwrd.list_currency_requests 
    @id UNIQUEIDENTIFIER = NULL
AS
BEGIN
    SET NOCOUNT ON;

    SELECT *
    FROM frwrd.currency_requests c
    WHERE (@id IS NULL OR c.id = @id)
    ORDER BY c.created_at DESC;
END
GO

IF OBJECT_ID('frwrd.save_currency_request', 'P') IS NOT NULL
    DROP PROCEDURE frwrd.save_currency_request
GO
-- inicial
CREATE PROCEDURE frwrd.save_currency_request
    @id UNIQUEIDENTIFIER = NULL,
    @user_id VARCHAR(12),
    @cliente NVARCHAR(MAX),
    @rut NVARCHAR(50),
    @monto_negocio_usd DECIMAL(15,2),
    @unidades INT,
    @numeros_internos NVARCHAR(MAX) = NULL,
    @notas NVARCHAR(MAX) = NULL,
    @payments NVARCHAR(MAX) = '[]',
    @estado NVARCHAR(50) = 'BORRADOR',
    @tc_referencial NUMERIC(18,6) = NULL,
    @banco NVARCHAR(255) = NULL,
    @dias_forward INT = NULL,
    @porcentaje_cobertura DECIMAL(5,2) = NULL,
    @numero_sie NVARCHAR(255) = NULL,
    @tc_cliente NUMERIC(18,6) = NULL,
    @tc_spot NUMERIC(18,6) = NULL,
    @puntos_forwards NUMERIC(18,6) = NULL,
    @tc_all_in NUMERIC(18,6) = NULL,
    @bank_comparison_data NVARCHAR(MAX) = NULL,
    @fecha_vencimiento DATETIMEOFFSET = NULL,
    @valor_factura_usd_neto NUMERIC(18,6) = NULL,
    @valor_factura_usd_total NUMERIC(18,6) = NULL,
    @tc_factura NUMERIC(18,6) = NULL,
    @total_factura_clp NUMERIC(18,6) = NULL
AS
BEGIN
    SET NOCOUNT ON
    DECLARE @rowcount INT = 0, 
        @newid UNIQUEIDENTIFIER, 
        @error_msg NVARCHAR(MAX)
        
    BEGIN TRY
    BEGIN TRAN

        -- Set current user context
        EXEC frwrd.sp_set_current_user @user_id = @user_id
        
        SET @newid = @id
        
        -- Try UPDATE first if @id is provided
        IF @id IS NOT NULL
        BEGIN
            UPDATE frwrd.currency_requests
            SET 
                cliente = @cliente,
                rut = @rut,
                monto_negocio_usd = @monto_negocio_usd,
                unidades = @unidades,
                numeros_internos = ISNULL(@numeros_internos, '[]'),
                notas = @notas,
                banco = @banco,
                dias_forward = @dias_forward,
                porcentaje_cobertura = @porcentaje_cobertura,
                payments = @payments,
                estado = @estado,
                numero_sie = @numero_sie,
                tc_referencial = @tc_referencial,
                tc_cliente = @tc_cliente,
                tc_spot = @tc_spot,
                puntos_forwards = @puntos_forwards,
                tc_all_in = @tc_all_in,
                bank_comparison_data = @bank_comparison_data,
                fecha_vencimiento = @fecha_vencimiento,
                valor_factura_usd_neto = @valor_factura_usd_neto,
                valor_factura_usd_total = @valor_factura_usd_total,
                tc_factura = @tc_factura,
                total_factura_clp = @total_factura_clp,
                updated_at = GETDATE()
            WHERE id = @id
            
            SET @rowcount = @@ROWCOUNT
        END

        -- If no rows updated (or @id was NULL), perform INSERT
        IF @rowcount = 0
        BEGIN
            SET @newid = NEWID()
            
            INSERT INTO frwrd.currency_requests
            (
                id,
                user_id,
                cliente,
                rut,
                monto_negocio_usd,
                unidades,
                numeros_internos,
                notas,
                banco,
                dias_forward,
                porcentaje_cobertura,
                payments,
                estado,
                numero_sie,
                tc_referencial,
                tc_cliente,
                tc_spot,
                puntos_forwards,
                tc_all_in,
                bank_comparison_data,
                fecha_vencimiento,
                valor_factura_usd_neto,
                valor_factura_usd_total,
                tc_factura,
                total_factura_clp
            )
            VALUES
            (
                @newid,
                @user_id,
                @cliente,
                @rut,
                @monto_negocio_usd,
                @unidades,
                ISNULL(@numeros_internos, '[]'),
                @notas,
                @banco,
                @dias_forward,
                @porcentaje_cobertura,
                @payments,
                @estado,
                @numero_sie,
                @tc_referencial,
                @tc_cliente,
                @tc_spot,
                @puntos_forwards,
                @tc_all_in,
                @bank_comparison_data,
                @fecha_vencimiento,
                @valor_factura_usd_neto,
                @valor_factura_usd_total,
                @tc_factura,
                @total_factura_clp
            )
            
            SET @rowcount = @@ROWCOUNT

            IF @rowcount <> 1
                THROW 51000, 'numero de registros insertados <> 1', 1
        END
        
    COMMIT TRAN  
    END TRY
    BEGIN CATCH
        SELECT @error_msg = ERROR_MESSAGE()
        IF @@TRANCOUNT > 0
            ROLLBACK TRAN
    END CATCH
        
    SELECT error_msg = @error_msg, registros = @rowcount, nuevoID = @newid
END

GO
IF OBJECT_ID('frwrd.list_bank_executives', 'P') IS NOT NULL
    DROP PROCEDURE frwrd.list_bank_executives
GO
--INICIAL
CREATE PROCEDURE frwrd.list_bank_executives 
    @id UNIQUEIDENTIFIER = NULL,
    @bank_name NVARCHAR(255) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    SELECT *
    FROM frwrd.bank_executives be
    WHERE (@id IS NULL OR be.id = @id)
    AND (@bank_name IS NULL OR be.bank_name = @bank_name)
    ORDER BY be.bank_name DESC;
END
GO

IF OBJECT_ID('frwrd.save_bank_executive', 'P') IS NOT NULL
    DROP PROCEDURE frwrd.save_bank_executive
GO
-- inicial
CREATE PROCEDURE frwrd.save_bank_executive
    @id UNIQUEIDENTIFIER = NULL,
    @user_id VARCHAR(12),
    @name NVARCHAR(255),
    @contact_number NVARCHAR(50),
    @bank_name NVARCHAR(255)
AS
BEGIN
    SET NOCOUNT ON
    DECLARE @rowcount INT = 0, 
        @newid UNIQUEIDENTIFIER, 
        @error_msg NVARCHAR(MAX)
        
    BEGIN TRY
    BEGIN TRAN

        -- Set current user context
        EXEC frwrd.sp_set_current_user @user_id = @user_id
        
        SET @newid = @id
        
        -- Try UPDATE first if @id is provided
        IF @id IS NOT NULL
        BEGIN
            UPDATE frwrd.bank_executives
            SET 
                name = @name,
                contact_number = @contact_number,
                bank_name = @bank_name,
                updated_at = GETDATE()
            WHERE id = @id
            
            SET @rowcount = @@ROWCOUNT
        END

        -- If no rows updated (or @id was NULL), perform INSERT
        IF @rowcount = 0
        BEGIN
            SET @newid = NEWID()
            
            INSERT INTO frwrd.bank_executives
            (
                id,
                name,
                contact_number,
                bank_name
            )
            VALUES
            (
                @newid,
                @name,
                @contact_number,
                @bank_name
            )
            
            SET @rowcount = @@ROWCOUNT

            IF @rowcount <> 1
                THROW 51000, 'numero de registros insertados <> 1', 1
        END
        
    COMMIT TRAN  
    END TRY
    BEGIN CATCH
        SELECT @error_msg = ERROR_MESSAGE()
        IF @@TRANCOUNT > 0
            ROLLBACK TRAN
    END CATCH
        
    SELECT error_msg = @error_msg, registros = @rowcount, nuevoID = @newid
END

GO
IF OBJECT_ID('frwrd.delete_bank_executive', 'P') IS NOT NULL
    DROP PROCEDURE frwrd.delete_bank_executive
GO
-- inicial
CREATE PROCEDURE frwrd.delete_bank_executive
    @id UNIQUEIDENTIFIER,
    @user_id VARCHAR(12)
AS
BEGIN
    SET NOCOUNT ON
    DECLARE @rowcount INT = 0, 
        @error_msg NVARCHAR(MAX),
        @deleted_data NVARCHAR(MAX)
        
    BEGIN TRY
    BEGIN TRAN

        -- Set current user context
        EXEC frwrd.sp_set_current_user @user_id = @user_id
        
        -- Capture the data before deletion
        SELECT @deleted_data = (
            SELECT * 
            FROM frwrd.bank_executives 
            WHERE id = @id 
            FOR JSON PATH, WITHOUT_ARRAY_WRAPPER
        )
        
        -- Perform DELETE operation
        DELETE FROM frwrd.bank_executives
        WHERE id = @id
        
        SET @rowcount = @@ROWCOUNT

        IF @rowcount = 0
            THROW 51001, 'No se encontro el registro a eliminar', 1
        
    COMMIT TRAN  
    END TRY
    BEGIN CATCH
        SELECT @error_msg = ERROR_MESSAGE()
        IF @@TRANCOUNT > 0
            ROLLBACK TRAN
    END CATCH
        
    SELECT 
        error_msg = @error_msg, 
        registros = @rowcount, 
        deleted_data = @deleted_data
END


GO

GO 

-- Procedure to fetch last approval row from audit_logs for approved requests
IF OBJECT_ID('frwrd.get_approval_info', 'P') IS NOT NULL
    DROP PROCEDURE frwrd.get_approval_info
GO
-- inicial
CREATE PROCEDURE frwrd.get_approval_info
    @request_id UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @error_msg NVARCHAR(MAX)
    
    BEGIN TRY
        -- Get the last approval record for the request where estado changed to 'APROBADA'
        SELECT TOP 1
            al.id,
            al.record_id,
            al.action,
            al.old_data,
            al.new_data,
            al.user_id,
            al.user_email,
            al.ip_address,
            al.user_agent,
            al.created_at
        FROM frwrd.audit_logs al
        WHERE al.table_name = 'currency_requests'
            AND al.record_id = @request_id
            AND al.new_data LIKE '%"estado"%"APROBADA"%'
            AND al.action = 'STATUS_CHANGE'
        ORDER BY al.created_at DESC;
        
    END TRY
    BEGIN CATCH
        SELECT @error_msg = ERROR_MESSAGE()
        SELECT error_msg = @error_msg
    END CATCH
END

GO


EXEC ECP_ListaVendedores_Consola

Entidad_comercial	Nombre	Tipo