export type User = {
    username: string,
    id: string,
    token: string
};


export type Project = {
    id: string;
    title: string;
    description?: string;
    imageUrl?: string;
    tags?: string[];
    author?: string;
    authorAvatar?: string;
    projectUrl?: string;
}

export type FileType = {
    id: string;
    name: string;
    type: 'file' | 'folder';
    language?: string;
    content?: string;
    children?: FileType[];
};


export type Message = {
    id: string;
    role: 'user';
    content: string;
    createdOn: string;
    assistantResponses: AssistantResponse[];
    expanded?: boolean;
};

export type AssistantResponse = {
    id: string;
    role: 'assistant';
    content: string;
    createdOn: string;
};