import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { initialPrompt } = await request.json();
    
    if (!initialPrompt) {
      return NextResponse.json(
        { error: 'Initial prompt is required' },
        { status: 400 }
      );
    }

    const response = await fetch('http://localhost:3001/api/project', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ initialPrompt }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create project');
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error creating project:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An error occurred while creating the project' },
      { status: 500 }
    );
  }
}
