-- =============================================================================
-- ESTRUCTURA FINAL DE BASE DE DATOS - SISTEMA DE SOLICITUDES DE SEGUROS DE CAMBIO
-- Consolidado de todas las migraciones de Sp abase (17/09/2024 - 30/10/2024)
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
    @user_id VARCHAR(12) = NULL,
    @cliente NVARCHAR(MAX) = NULL,
    @rut NVARCHAR(50) = NULL,
    @monto_negocio_usd DECIMAL(15,2) = NULL,
    @unidades INT = NULL,
    @numeros_internos NVARCHAR(MAX) = NULL,
    @notas NVARCHAR(MAX) = NULL,
    @payments NVARCHAR(MAX) = NULL,
    @estado NVARCHAR(50) = NULL,
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
                cliente = ISNULL(@cliente, cliente),
                rut = ISNULL(@rut, rut),
                monto_negocio_usd = ISNULL(@monto_negocio_usd, monto_negocio_usd),
                unidades = ISNULL(@unidades, unidades),
                numeros_internos = ISNULL(@numeros_internos, numeros_internos),
                notas = ISNULL(@notas, notas),
                banco = ISNULL(@banco, banco),
                dias_forward = ISNULL(@dias_forward, dias_forward),
                porcentaje_cobertura = ISNULL(@porcentaje_cobertura, porcentaje_cobertura),
                payments = ISNULL(@payments, payments),
                estado = ISNULL(@estado, estado),
                numero_sie = ISNULL(@numero_sie, numero_sie),
                tc_referencial = ISNULL(@tc_referencial, tc_referencial),
                tc_cliente = ISNULL(@tc_cliente, tc_cliente),
                tc_spot = ISNULL(@tc_spot, tc_spot),
                puntos_forwards = ISNULL(@puntos_forwards, puntos_forwards),
                tc_all_in = ISNULL(@tc_all_in, tc_all_in),
                bank_comparison_data = ISNULL(@bank_comparison_data, bank_comparison_data),
                fecha_vencimiento = ISNULL(@fecha_vencimiento, fecha_vencimiento),
                valor_factura_usd_neto = ISNULL(@valor_factura_usd_neto, valor_factura_usd_neto),
                valor_factura_usd_total = ISNULL(@valor_factura_usd_total, valor_factura_usd_total),
                tc_factura = ISNULL(@tc_factura, tc_factura),
                total_factura_clp = ISNULL(@total_factura_clp, total_factura_clp),
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
-- inicial
CREATE PROCEDURE frwrd.producto_individual
    @nInterno integer
AS
BEGIN
    SET NOCOUNT ON;
    
    SELECT 
        p.Nombre
    FROM 
        Productos_individuales
    INNER JOIN 
        Productos p 
            ON Productos_individuales.Producto = p.Producto
    WHERE 
        Numero_interno_epysa = @nInterno

END

GO

-- =============================================================================
-- PROCEDIMIENTO PARA ENVÍO DE CORREO DE SOLICITUD APROBADA
-- =============================================================================

IF OBJECT_ID('frwrd.send_approval_email', 'P') IS NOT NULL
    DROP PROCEDURE frwrd.send_approval_email
GO
-- inicial
CREATE PROCEDURE frwrd.send_approval_email
    @request_id UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @error_msg NVARCHAR(MAX)
    DECLARE @html_body NVARCHAR(MAX)
    DECLARE @subject NVARCHAR(255)
    DECLARE @recipients NVARCHAR(MAX)
    DECLARE @cc_list NVARCHAR(MAX)
    
    -- Variables para datos de la solicitud
    DECLARE @id UNIQUEIDENTIFIER
    DECLARE @user_id VARCHAR(12)
    DECLARE @cliente NVARCHAR(MAX)
    DECLARE @rut NVARCHAR(50)
    DECLARE @monto_negocio_usd DECIMAL(15,2)
    DECLARE @unidades INT
    DECLARE @numeros_internos NVARCHAR(MAX)
    DECLARE @notas NVARCHAR(MAX)
    DECLARE @banco NVARCHAR(255)
    DECLARE @dias_forward INT
    DECLARE @porcentaje_cobertura DECIMAL(5,2)
    DECLARE @payments NVARCHAR(MAX)
    DECLARE @estado NVARCHAR(50)
    DECLARE @tc_referencial NUMERIC(18,6)
    DECLARE @tc_cliente NUMERIC(18,6)
    DECLARE @tc_spot NUMERIC(18,6)
    DECLARE @puntos_forwards NUMERIC(18,6)
    DECLARE @tc_all_in NUMERIC(18,6)
    DECLARE @fecha_vencimiento DATETIMEOFFSET
    DECLARE @valor_factura_usd_neto NUMERIC(18,6)
    DECLARE @valor_factura_usd_total NUMERIC(18,6)
    DECLARE @tc_factura NUMERIC(18,6)
    DECLARE @total_factura_clp NUMERIC(18,6)
    DECLARE @created_at DATETIMEOFFSET
    
    -- Variables para datos del usuario
    DECLARE @vendedor_nombre NVARCHAR(100)
    DECLARE @vendedor_email NVARCHAR(50)
    
    -- Variables para número de solicitud
    DECLARE @request_number NVARCHAR(20)
    DECLARE @request_index INT
    
    -- Variables para HTML de pagos
    DECLARE @payments_html NVARCHAR(MAX) = ''
    DECLARE @coverage_html NVARCHAR(MAX) = ''
    DECLARE @billing_html NVARCHAR(MAX) = ''
    DECLARE @numeros_internos_formatted NVARCHAR(MAX) = ''
    
    -- Variables para cálculos de facturación
    DECLARE @valor_factura_total_calc NUMERIC(18,6)
    DECLARE @valor_factura_neto_calc NUMERIC(18,6)
    DECLARE @total_factura_clp_calc NUMERIC(18,6)
    
    BEGIN TRY
        -- Obtener datos de la solicitud
        SELECT 
            @id = id,
            @user_id = user_id,
            @cliente = cliente,
            @rut = rut,
            @monto_negocio_usd = monto_negocio_usd,
            @unidades = unidades,
            @numeros_internos = numeros_internos,
            @notas = notas,
            @banco = banco,
            @dias_forward = dias_forward,
            @porcentaje_cobertura = porcentaje_cobertura,
            @payments = payments,
            @estado = estado,
            @tc_referencial = tc_referencial,
            @tc_cliente = tc_cliente,
            @tc_spot = tc_spot,
            @puntos_forwards = puntos_forwards,
            @tc_all_in = tc_all_in,
            @fecha_vencimiento = fecha_vencimiento,
            @valor_factura_usd_neto = valor_factura_usd_neto,
            @valor_factura_usd_total = valor_factura_usd_total,
            @tc_factura = tc_factura,
            @total_factura_clp = total_factura_clp,
            @created_at = created_at
        FROM frwrd.currency_requests
        WHERE id = @request_id
        
        IF @id IS NULL
        BEGIN
            RAISERROR('Solicitud no encontrada', 16, 1)
            RETURN
        END
        
        -- Obtener datos del vendedor
        SELECT 
            @vendedor_nombre = LTRIM(RTRIM(ISNULL(Nombres_usuario, ''))) + ' ' + LTRIM(RTRIM(ISNULL(Apellidos_usuario, ''))),
            @vendedor_email = Email
        FROM Usuarios
        WHERE Id_usuario = @user_id
        
        IF @vendedor_email IS NULL
            SET @vendedor_email = 'noreply@epysa.cl'
        
        -- Calcular número de solicitud basado en orden de creación
        SELECT @request_index = COUNT(*)
        FROM frwrd.currency_requests
        WHERE created_at <= @created_at
        
        SET @request_number = '#' + RIGHT('0000' + CAST(@request_index AS VARCHAR), 4)
        
        -- Generar HTML de pagos desde JSON
        -- JSON structure: [{"tipo": "PIE", "montoClp": 12345.67, "fechaVencimiento": "2024-12-31", "observaciones": "..."}]
        ;WITH PaymentsCTE AS (
            SELECT 
                ROW_NUMBER() OVER (ORDER BY (SELECT NULL)) as idx,
                JSON_VALUE(value, '$.tipo') as payment_type,
                JSON_VALUE(value, '$.montoClp') as monto_clp,
                JSON_VALUE(value, '$.fechaVencimiento') as fecha_vencimiento,
                JSON_VALUE(value, '$.observaciones') as observaciones
            FROM OPENJSON(@payments)
        )
        SELECT @payments_html = @payments_html + 
            '<tr>' +
            '<td>' + CAST(idx AS VARCHAR) + '</td>' +
            '<td>' + 
                CASE payment_type
                    WHEN 'PIE' THEN 'Pie'
                    WHEN 'CONTRA_ENTREGA' THEN 'Contra Entrega'
                    WHEN 'FINANCIAMIENTO' THEN 'Financiamiento'
                    WHEN 'CREDITO_EPYSA' THEN N'Crédito Epysa'
                    WHEN 'BEP' THEN 'BEP'
                    WHEN 'CHATARRIZACION' THEN N'Chatarrización'
                    ELSE ISNULL(payment_type, 'N/A')
                END +
            '</td>' +
            '<td>$' + ISNULL(FORMAT(CAST(monto_clp AS DECIMAL(15,2)), 'N2', 'es-CL'), 'N/A') + '</td>' +
            '<td>' + ISNULL(FORMAT(CAST(fecha_vencimiento AS DATE), 'dd-MM-yyyy'), 'N/A') + '</td>' +
            '<td>' + ISNULL(observaciones, '-') + '</td>' +
            '</tr>'
        FROM PaymentsCTE
        
        IF @payments_html = '' OR @payments_html IS NULL
            SET @payments_html = '<tr><td colspan="5">Sin medios de pago registrados</td></tr>'
        
        -- Generar string formateado de números internos desde JSON
        -- JSON structure: [{"numeroInterno": 12345, "modelo": "Bus Model"}]
        ;WITH NumerosInternosCTE AS (
            SELECT 
                JSON_VALUE(value, '$.numeroInterno') as numero_interno,
                JSON_VALUE(value, '$.modelo') as modelo
            FROM OPENJSON(@numeros_internos)
            WHERE JSON_VALUE(value, '$.numeroInterno') IS NOT NULL 
              AND CAST(JSON_VALUE(value, '$.numeroInterno') AS INT) > 0
        )
        SELECT @numeros_internos_formatted = 
            STUFF((
                SELECT ', ' + numero_interno + 
                    CASE WHEN modelo IS NOT NULL AND modelo != '' 
                         THEN ' (' + modelo + ')' 
                         ELSE '' 
                    END
                FROM NumerosInternosCTE
                FOR XML PATH(''), TYPE
            ).value('.', 'NVARCHAR(MAX)'), 1, 2, '')
        
        IF @numeros_internos_formatted = '' OR @numeros_internos_formatted IS NULL
            SET @numeros_internos_formatted = '-'
        
        -- Generar HTML de cobertura si está aprobada
        IF @estado = 'APROBADA'
        BEGIN
            SET @coverage_html = '
            <div class="pdf-section">
              <div class="pdf-section-title">Parámetros de Cobertura</div>
              <div class="pdf-grid">
                <div class="pdf-field">
                  <div class="pdf-field-label">Banco</div>
                  <div class="pdf-field-value">' + ISNULL(@banco, 'N/A') + '</div>
                </div>
                <div class="pdf-field">
                  <div class="pdf-field-label">Días Forward</div>
                  <div class="pdf-field-value">' + ISNULL(CAST(@dias_forward AS VARCHAR), 'N/A') + '</div>
                </div>
                <div class="pdf-field">
                  <div class="pdf-field-label">Fecha Vencimiento</div>
                  <div class="pdf-field-value">' + ISNULL(FORMAT(CAST(@fecha_vencimiento AS DATE), 'dd-MM-yyyy'), 'N/A') + '</div>
                </div>
                <div class="pdf-field">
                  <div class="pdf-field-label">% Cobertura</div>
                  <div class="pdf-field-value">' + ISNULL(FORMAT(@porcentaje_cobertura, 'N2') + '%', 'N/A') + '</div>
                </div>
                <div class="pdf-field">
                  <div class="pdf-field-label">TC Cliente</div>
                  <div class="pdf-field-value">$' + ISNULL(FORMAT(@tc_cliente, 'N4'), 'N/A') + '</div>
                </div>
                <div class="pdf-field">
                  <div class="pdf-field-label">TC Spot</div>
                  <div class="pdf-field-value">$' + ISNULL(FORMAT(@tc_spot, 'N4'), 'N/A') + '</div>
                </div>
                <div class="pdf-field">
                  <div class="pdf-field-label">Puntos Forward</div>
                  <div class="pdf-field-value">$' + ISNULL(FORMAT(@puntos_forwards, 'N4'), 'N/A') + '</div>
                </div>
                <div class="pdf-field">
                  <div class="pdf-field-label">TC All-in</div>
                  <div class="pdf-field-value">$' + ISNULL(FORMAT(@tc_all_in, 'N4'), 'N/A') + '</div>
                </div>
              </div>
            </div>'
            
            -- Calcular y generar HTML de facturación si está aprobada
            IF @tc_all_in > 0 AND @tc_cliente > 0 AND @unidades > 0
            BEGIN
                SET @valor_factura_total_calc = (@monto_negocio_usd * @tc_cliente) / (@tc_all_in * @unidades)
                SET @valor_factura_neto_calc = @valor_factura_total_calc / 1.19
                SET @total_factura_clp_calc = @valor_factura_total_calc * @tc_all_in
                
                SET @billing_html = '
                <div class="pdf-section full-width">
                  <div class="pdf-section-title">Facturación</div>
                  <div class="pdf-grid" style="grid-template-columns: repeat(4, 1fr);">
                    <div class="pdf-field">
                      <div class="pdf-field-label">Valor Factura USD por Bus Neto</div>
                      <div class="pdf-field-value">$' + FORMAT(@valor_factura_neto_calc, 'N2') + '</div>
                    </div>
                    <div class="pdf-field">
                      <div class="pdf-field-label">Valor Factura USD por Bus Total</div>
                      <div class="pdf-field-value">$' + FORMAT(@valor_factura_total_calc, 'N2') + '</div>
                    </div>
                    <div class="pdf-field">
                      <div class="pdf-field-label">TC Factura</div>
                      <div class="pdf-field-value">' + FORMAT(@tc_all_in, 'N4') + '</div>
                    </div>
                    <div class="pdf-field">
                      <div class="pdf-field-label">Total Factura CLP por Bus</div>
                      <div class="pdf-field-value">$' + FORMAT(@total_factura_clp_calc, 'N0', 'es-CL') + '</div>
                    </div>
                  </div>
                </div>'
            END
        END
        
        -- Construir asunto del correo
        SET @subject = N'Solicitud de Cobertura Aprobada - ' + @cliente
        
        -- Construir lista de destinatarios
        SET @recipients = @vendedor_email
        
        -- Lista CC (coordinadores y administradores)
        SET @cc_list = 'marco.navarrete@epysa.cl;analia.sepulveda@epysa.cl;bryan.vickers@epysa.cl;juan.donoso@epysa.cl;juan.villanueva@epysa.cl;kaina.villacura@epysa.cl;gonzalo.calderon@epysa.cl;felipe.rodriguez@epysa.cl'
        
        -- Construir HTML del correo
        SET @html_body = '
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8">
    <title>Solicitud Aprobada ' + @request_number + '</title>
    <style>
      @page { margin: 1cm; size: A4 portrait; }
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body {
        font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif;
        font-size: 14px;
        line-height: 1.4;
        color: #1a1a1a;
        background: white;
        padding: 20px;
        max-width: 800px;
        margin: 0 auto;
      }
      .pdf-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding-bottom: 10px;
        border-bottom: 2px solid #b91c1c;
        margin-bottom: 12px;
      }
      .pdf-logo { max-width: 120px; height: auto; }
      .pdf-title-section { text-align: right; }
      .pdf-title {
        font-size: 24px;
        font-weight: 700;
        color: #b91c1c;
        line-height: 1.2;
      }
      .pdf-subtitle {
        font-size: 13px;
        color: #6b7280;
        margin-top: 3px;
      }
      .pdf-status-badge {
        display: inline-block;
        padding: 4px 12px;
        border-radius: 12px;
        font-size: 11px;
        font-weight: 700;
        text-transform: uppercase;
        margin-top: 6px;
      }
      .pdf-status-aprobada { background: #dcfce7; color: #166534; }
      .pdf-status-en-revision { background: #fef3c7; color: #92400e; }
      .pdf-status-borrador { background: #f3f4f6; color: #374151; }
      .pdf-status-rechazada { background: #fee2e2; color: #991b1b; }
      .pdf-status-anulada { background: #f3f4f6; color: #6b7280; }
      
      .two-column-layout {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
        margin-bottom: 12px;
      }
      .full-width { grid-column: 1 / -1; }
      
      .pdf-section {
        margin-bottom: 10px;
        page-break-inside: avoid;
      }
      .pdf-section-title {
        font-size: 16px;
        font-weight: 700;
        color: #b91c1c;
        margin-bottom: 8px;
        padding-bottom: 4px;
        border-bottom: 1px solid #e5e7eb;
      }
      .pdf-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 10px;
      }
      .pdf-field {
        padding: 10px;
        background: #f9fafb;
        border-radius: 4px;
        border: 1px solid #e5e7eb;
      }
      .pdf-field-label {
        font-size: 10px;
        color: #6b7280;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.3px;
        margin-bottom: 4px;
      }
      .pdf-field-value {
        font-size: 14px;
        font-weight: 700;
        color: #1a1a1a;
      }
      
      .pdf-table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 8px;
        font-size: 13px;
      }
      .pdf-table th {
        background: #b91c1c;
        color: white;
        padding: 8px 10px;
        text-align: left;
        font-size: 12px;
        font-weight: 700;
      }
      .pdf-table td {
        padding: 8px 10px;
        border-bottom: 1px solid #e5e7eb;
        font-size: 12px;
      }
      .pdf-table tbody tr:nth-child(even) {
        background: #f9fafb;
      }
    </style>
  </head>
  <body>
    <div class="pdf-header">
      <img src="https://hblbwermqzsbibanrjpy.supabase.co/storage/v1/object/public/assets/epysa-logo.jpg" alt="Epysa Logo" class="pdf-logo" />
      <div class="pdf-title-section">
        <div class="pdf-title">Solicitud de Cobertura</div>
        <div class="pdf-subtitle">Folio: ' + @request_number + '</div>
        <div class="pdf-subtitle">Fecha: ' + FORMAT(@created_at, 'dd-MM-yyyy') + '</div>
        <span class="pdf-status-badge pdf-status-' + LOWER(@estado) + '">' + @estado + '</span>
      </div>
    </div>

    <div class="two-column-layout">
      <div class="pdf-section">
        <div class="pdf-section-title">Información del Cliente</div>
        <div class="pdf-grid">
          <div class="pdf-field">
            <div class="pdf-field-label">Cliente</div>
            <div class="pdf-field-value">' + ISNULL(@cliente, 'N/A') + '</div>
          </div>
          <div class="pdf-field">
            <div class="pdf-field-label">RUT</div>
            <div class="pdf-field-value">' + ISNULL(@rut, 'N/A') + '</div>
          </div>
          <div class="pdf-field">
            <div class="pdf-field-label">Monto Negocio (USD)</div>
            <div class="pdf-field-value">$' + FORMAT(@monto_negocio_usd, 'N2', 'es-CL') + '</div>
          </div>
          <div class="pdf-field">
            <div class="pdf-field-label">Unidades</div>
            <div class="pdf-field-value">' + CAST(@unidades AS VARCHAR) + '</div>
          </div>
          <div class="pdf-field">
            <div class="pdf-field-label">Vendedor</div>
            <div class="pdf-field-value">' + ISNULL(@vendedor_nombre, @vendedor_email) + '</div>
          </div>
        </div>
      </div>

      ' + @coverage_html + '
    </div>

    <div class="pdf-section full-width">
      <div class="pdf-section-title">Medios de Pago</div>
      <table class="pdf-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Tipo</th>
            <th>Monto CLP</th>
            <th>Fecha Vencimiento</th>
            <th>Observaciones</th>
          </tr>
        </thead>
        <tbody>
          ' + @payments_html + '
        </tbody>
      </table>
      
      <!-- Internal Numbers -->
      <div style="margin-top: 8px;">
        <div class="pdf-field">
          <div class="pdf-field-label">Números Internos</div>
          <div class="pdf-field-value">' + @numeros_internos_formatted + '</div>
        </div>
      </div>
    </div>

    ' + @billing_html + '
  </body>
</html>'
        
        -- Enviar correo usando Database Mail
        EXEC msdb.dbo.sp_send_dbmail
            @recipients = @recipients,
            @copy_recipients = @cc_list,
            @subject = @subject,
            @body = @html_body,
            @body_format = 'HTML'
        
        -- Retornar éxito
        SELECT 
            error_msg = NULL,
            success = 1,
            message = 'Correo enviado correctamente a ' + @recipients
            
    END TRY
    BEGIN CATCH
        SELECT @error_msg = ERROR_MESSAGE()
        SELECT 
            error_msg = @error_msg,
            success = 0,
            message = 'Error al enviar correo: ' + @error_msg
    END CATCH
END





GO

EXEC frwrd.send_approval_email 
    @request_id = '48ff88fe-5771-4a36-9e2c-fa42449e5f76'  -- Reemplazar con un ID de solicitud válido para prueba

GO
-- inicial
ALTER PROCEDURE frwrd.lista_reservados
    @cliente NVARCHAR(100)
AS
BEGIN
    SET NOCOUNT ON; 


    SELECT 
        modelo = Productos.Nombre,
        numeroInterno = Productos_individuales.Numero_interno_epysa
    FROM Productos_individuales 
    INNER JOIN Productos 
        ON Productos_individuales.Producto = Productos.Producto
    WHERE Cliente_Reserva = @cliente
    AND Productos_individuales.Estado NOT IN ( 'F', 'V' )
    ORDER BY Productos_individuales.Numero_interno_epysa ASC;

END


    SELECT 
        modelo = Productos.Nombre,
        numeroInterno = Productos_individuales.Numero_interno_epysa,
        Cliente_Reserva
    FROM Productos_individuales 
    INNER JOIN Productos 
        ON Productos_individuales.Producto = Productos.Producto
    WHERE Cliente_Reserva IS NOT NULL
    AND Productos_individuales.Estado NOT IN ( 'F', 'V' )
    ORDER BY Productos_individuales.Cliente_Reserva ASC;
