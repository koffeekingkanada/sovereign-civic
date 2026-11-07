import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface Cell {
    value: Value;
    name: string;
}
export interface DirectoryEntry {
    principal: UserId;
    displayName: string;
    isDemo: boolean;
}
export type Error_ = {
    __kind__: "FrontendOriginsNotConfigured";
    FrontendOriginsNotConfigured: null;
} | {
    __kind__: "MixedSsoSources";
    MixedSsoSources: {
        otherKeys: Array<string>;
        ssoKeys: Array<string>;
    };
} | {
    __kind__: "Stale";
    Stale: {
        ageNs: bigint;
    };
} | {
    __kind__: "MalformedCandid";
    MalformedCandid: null;
} | {
    __kind__: "AmbiguousAttribute";
    AmbiguousAttribute: {
        field: string;
        sources: Array<string>;
    };
} | {
    __kind__: "NoAttributes";
    NoAttributes: null;
} | {
    __kind__: "UnknownNonce";
    UnknownNonce: null;
} | {
    __kind__: "UntrustedSsoSource";
    UntrustedSsoSource: {
        domain: string;
    };
} | {
    __kind__: "MissingField";
    MissingField: string;
} | {
    __kind__: "FrontendOriginMismatch";
    FrontendOriginMismatch: {
        got: string;
        expected: Array<string>;
    };
};
export interface Message {
    content: string;
    recipient: UserId;
    sender: UserId;
    timestamp: Timestamp;
}
export interface Profile {
    status: Status;
    principal: UserId;
    workEmail: string;
    role: Role;
    fullName: string;
    isDemo: boolean;
    jobTitle: string;
    department: string;
    registeredAt: Timestamp;
}
export interface Result {
    hasMore: boolean;
    rows: Array<Array<Cell>>;
}
export type Result__1 = {
    __kind__: "ok";
    ok: null;
} | {
    __kind__: "err";
    err: Error_;
};
export type Timestamp = bigint;
export type UserId = Principal;
export type Value = {
    __kind__: "int";
    int: bigint;
} | {
    __kind__: "nat";
    nat: bigint;
} | {
    __kind__: "float";
    float: number;
} | {
    __kind__: "bool";
    bool: boolean;
} | {
    __kind__: "null";
    null: null;
} | {
    __kind__: "text";
    text: string;
};
export enum Role {
    member = "member",
    departmentAdmin = "departmentAdmin",
    superAdmin = "superAdmin"
}
export enum Status {
    pending = "pending",
    denied = "denied",
    approved = "approved",
    suspended = "suspended"
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    appointDepartmentAdmin(user: Principal): Promise<Profile>;
    approveUser(user: Principal): Promise<Profile>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    denyUser(user: Principal): Promise<Profile>;
    execute(qJson: string): Promise<Result>;
    getApiDoc(): Promise<string>;
    getCallerUserRole(): Promise<UserRole>;
    getDirectoryEntry(user: Principal): Promise<DirectoryEntry | null>;
    getMyProfile(): Promise<Profile | null>;
    getThread(other: Principal): Promise<Array<Message>>;
    isCallerAdmin(): Promise<boolean>;
    listApprovedUsers(): Promise<Array<Profile>>;
    listDirectory(): Promise<Array<DirectoryEntry>>;
    listPendingRequests(): Promise<Array<Profile>>;
    listSuspendedUsers(): Promise<Array<Profile>>;
    registerProfile(fullName: string, workEmail: string, department: string, jobTitle: string): Promise<Profile>;
    reinstateUser(user: Principal): Promise<Profile>;
    removeDepartmentAdmin(user: Principal): Promise<Profile>;
    schema(): Promise<string>;
    sendMessage(recipient: Principal, content: string): Promise<Message>;
    setDemoAccount(user: Principal, isDemo: boolean): Promise<Profile>;
    suspendUser(user: Principal): Promise<Profile>;
}
